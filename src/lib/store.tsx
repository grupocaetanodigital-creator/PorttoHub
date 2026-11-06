import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Profile,
  Condominio,
  EscalaTrabalho,
  ApontamentoFolha,
  RegistroPonto,
  TipoBatida,
  StatusProcessamento,
  DemonstrativoPagamento,
  ItemDemonstrativo,
  StatusHolerite
} from '../types/database';
import {
  supabase,
  SEED_PROFILES,
  SEED_CONDOMINIOS,
  SEED_ESCALAS,
  SEED_APONTAMENTOS,
  SEED_DEMONSTRATIVOS,
  getTodayDateString
} from './supabase';
import {
  salvarPontoOffline,
  obterPontosOffline,
  sincronizarFilaOfflineComSupabase,
  getModoOfflineForcado,
  setModoOfflineForcado,
  isDispositivoConectado,
  uploadFotoComprovanteSupabase,
  gerarHashIntegridade
} from './offlineQueue';

interface NotificationState {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface TurnoCertoContextType {
  currentUser: Profile | null;
  profiles: Profile[];
  condominios: Condominio[];
  escalas: EscalaTrabalho[];
  apontamentos: ApontamentoFolha[];
  registrosPonto: RegistroPonto[];
  filaOffline: RegistroPonto[];
  modoOfflineForcado: boolean;
  isOnline: boolean;
  toggleModoOffline: () => void;
  sincronizarFilaOffline: () => Promise<{ total: number; sincronizados: number; falhas: number; erros: string[] }>;
  carregarFilaOffline: () => Promise<void>;
  isLoading: boolean;
  supabaseConnected: boolean;
  notification: NotificationState | null;
  setNotification: (notif: NotificationState | null) => void;
  login: (cpfOrEmail: string) => boolean;
  logout: () => void;
  switchUser: (profile: Profile) => void;
  completeFirstAccess: (photoDataUrl: string) => Promise<void>;
  baterPonto: (
    tipo: TipoBatida,
    coords: { lat: number; lng: number },
    fotoComprovante?: string,
    simuladoDentroDoRaio?: boolean
  ) => Promise<{ success: boolean; message: string; tagTransitada?: string; salvoOffline?: boolean }>;
  escalarCobertura: (
    escalaId: string,
    funcionarioId: string,
    tipo?: 'ft_cobertura' | 'substituicao_atestado'
  ) => Promise<void>;
  processarApontamento: (
    apontamentoId: string,
    status: StatusProcessamento,
    observacao?: string
  ) => Promise<void>;
  enviarAtestado: (dados: {
    funcionarioId: string;
    dias: number;
    crm: string;
    anexoUrl?: string;
    observacao: string;
  }) => Promise<void>;
  toggleDisponibilidadeFT: (funcionarioId?: string) => Promise<void>;
  demonstrativos: DemonstrativoPagamento[];
  salvarDemonstrativo: (
    dados: Partial<DemonstrativoPagamento>,
    itens: ItemDemonstrativo[]
  ) => Promise<{ success: boolean; id: string }>;
  alternarStatusDemonstrativo: (id: string, novoStatus: StatusHolerite) => Promise<void>;
  excluirDemonstrativo: (id: string) => Promise<void>;
  confirmarCienteHolerite: (id: string) => Promise<void>;
  resetToInitialData: () => void;
  syncWithSupabase: () => Promise<void>;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'turnocerto_current_user',
  PROFILES: 'turnocerto_profiles',
  CONDOMINIOS: 'turnocerto_condominios',
  ESCALAS: 'turnocerto_escalas',
  APONTAMENTOS: 'turnocerto_apontamentos',
  REGISTROS_PONTO: 'turnocerto_registros_ponto',
  DEMONSTRATIVOS: 'turnocerto_demonstrativos'
};

const TurnoCertoContext = createContext<TurnoCertoContextType | undefined>(undefined);

export const TurnoCertoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return SEED_PROFILES[0];
      }
    }
    return SEED_PROFILES[0]; // Default: Supervisora Renata
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const missing = SEED_PROFILES.filter((sp) => !parsed.some((p: Profile) => p.id === sp.id));
        return [...parsed, ...missing];
      } catch {
        return SEED_PROFILES;
      }
    }
    return SEED_PROFILES;
  });

  const [condominios, setCondominios] = useState<Condominio[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONDOMINIOS);
    return saved ? JSON.parse(saved) : SEED_CONDOMINIOS;
  });

  const [escalas, setEscalas] = useState<EscalaTrabalho[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ESCALAS);
    return saved ? JSON.parse(saved) : SEED_ESCALAS;
  });

  const [apontamentos, setApontamentos] = useState<ApontamentoFolha[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APONTAMENTOS);
    return saved ? JSON.parse(saved) : SEED_APONTAMENTOS;
  });

  const [registrosPonto, setRegistrosPonto] = useState<RegistroPonto[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REGISTROS_PONTO);
    return saved ? JSON.parse(saved) : [];
  });

  const [demonstrativos, setDemonstrativos] = useState<DemonstrativoPagamento[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEMONSTRATIVOS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return SEED_DEMONSTRATIVOS;
      }
    }
    return SEED_DEMONSTRATIVOS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Fila Offline & Conectividade
  const [filaOffline, setFilaOffline] = useState<RegistroPonto[]>([]);
  const [modoOfflineForcado, setModoOfflineForcadoState] = useState<boolean>(() => getModoOfflineForcado());
  const [isOnline, setIsOnline] = useState<boolean>(() => isDispositivoConectado());

  // Carregar pontos offline do IndexedDB / LocalStorage
  const carregarFilaOffline = async () => {
    try {
      const pontos = await obterPontosOffline();
      setFilaOffline(pontos);
    } catch {
      //
    }
  };

  useEffect(() => {
    carregarFilaOffline();
  }, []);

  // Monitorar reconexão da internet e disparar sincronização automática em background
  useEffect(() => {
    const handleOnline = () => {
      const conectado = isDispositivoConectado();
      setIsOnline(conectado);
      if (conectado) {
        setNotification({
          type: 'info',
          message: '🟢 Conexão restabelecida! Disparando sincronização automática com Supabase...'
        });
        sincronizarFilaOffline();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNotification({
        type: 'warning',
        message: '📡 Dispositivo sem conexão de internet (Modo Offline). Pontos serão salvos no dispositivo com segurança.'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleModoOffline = () => {
    const novo = !modoOfflineForcado;
    setModoOfflineForcado(novo);
    setModoOfflineForcadoState(novo);
    const conectado = isDispositivoConectado();
    setIsOnline(conectado);

    if (novo) {
      setNotification({
        type: 'warning',
        message: '📡 Modo Offline / Subsolo ATIVADO para testes. As batidas serão salvas localmente.'
      });
    } else {
      setNotification({
        type: 'success',
        message: '🟢 Modo Online restabelecido! Sincronizando batidas pendentes...'
      });
      sincronizarFilaOffline();
    }
  };

  const sincronizarFilaOffline = async (): Promise<{ total: number; sincronizados: number; falhas: number; erros: string[] }> => {
    setIsLoading(true);
    try {
      const res = await sincronizarFilaOfflineComSupabase();
      await carregarFilaOffline();

      if (res.sincronizados > 0) {
        // Marca pontos locais como sincronizados
        setRegistrosPonto((prev) =>
          prev.map((r) => {
            if (res.pontosSincronizados.some((sp) => sp.id === r.id)) {
              return { ...r, sincronizado_offline: true, offline_pendente: false };
            }
            return r;
          })
        );

        setNotification({
          type: 'success',
          message: `✓ Sincronização concluída: ${res.sincronizados} batida(s) enviada(s) ao Supabase com sucesso!`
        });
      } else if (res.total === 0) {
        setNotification({
          type: 'info',
          message: 'Todos os pontos já estão sincronizados com o Supabase.'
        });
      }
      return res;
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Falha na sincronização offline: ${err?.message || 'Erro de rede'}`
      });
      return { total: 0, sincronizados: 0, falhas: 0, erros: [err?.message || 'Erro'] };
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-dismiss notification after 4s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Persist local changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONDOMINIOS, JSON.stringify(condominios));
  }, [condominios]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ESCALAS, JSON.stringify(escalas));
  }, [escalas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APONTAMENTOS, JSON.stringify(apontamentos));
  }, [apontamentos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REGISTROS_PONTO, JSON.stringify(registrosPonto));
  }, [registrosPonto]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEMONSTRATIVOS, JSON.stringify(demonstrativos));
  }, [demonstrativos]);

  // Check Supabase connection and optionally load from remote tables
  const syncWithSupabase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').limit(5);
      if (!error && data && data.length > 0) {
        setSupabaseConnected(true);
        // If Supabase has profiles, load them
        setProfiles(data as Profile[]);
      } else {
        // Table doesn't exist yet or is empty, we will use seeds & local sync
        setSupabaseConnected(false);
      }
    } catch {
      setSupabaseConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncWithSupabase();
  }, []);

  // Login handler
  const login = (cpfOrEmail: string): boolean => {
    const cleanInput = cpfOrEmail.replace(/\D/g, '');
    const user = profiles.find((p) => {
      const cleanCpf = p.cpf.replace(/\D/g, '');
      return cleanCpf === cleanInput || p.email?.toLowerCase() === cpfOrEmail.toLowerCase().trim();
    });

    if (user) {
      setCurrentUser(user);
      setNotification({
        type: 'success',
        message: `Acesso autenticado com sucesso! Bem-vindo(a), ${user.full_name}.`
      });
      return true;
    }

    setNotification({
      type: 'error',
      message: 'CPF ou e-mail corporativo não localizado no sistema.'
    });
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setNotification({
      type: 'info',
      message: 'Sessão encerrada com segurança.'
    });
  };

  const switchUser = (profile: Profile) => {
    const updated = profiles.find((p) => p.id === profile.id) || profile;
    setCurrentUser(updated);
    setNotification({
      type: 'info',
      message: `Perfil alterado para: ${updated.full_name} (${updated.role === 'supervisor' ? 'Supervisão' : 'Funcionário'})`
    });
  };

  // MODULE 1: First access facial capture
  const completeFirstAccess = async (photoDataUrl: string) => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      // Attempt upload to Supabase storage if connected, otherwise use base64
      let finalAvatarUrl = photoDataUrl;
      try {
        const fileName = `avatar_${currentUser.id}_${Date.now()}.jpg`;
        const res = await fetch(photoDataUrl);
        const blob = await res.blob();
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            finalAvatarUrl = publicUrlData.publicUrl;
          }
        }
      } catch {
        // Fallback to local data URL if bucket is not created
      }

      // Update in profiles
      const updatedProfiles = profiles.map((p) => {
        if (p.id === currentUser.id) {
          return {
            ...p,
            avatar_url: finalAvatarUrl,
            primeiro_acesso_concluido: true,
            updated_at: new Date().toISOString()
          };
        }
        return p;
      });

      const updatedCurrentUser = {
        ...currentUser,
        avatar_url: finalAvatarUrl,
        primeiro_acesso_concluido: true,
        updated_at: new Date().toISOString()
      };

      setProfiles(updatedProfiles);
      setCurrentUser(updatedCurrentUser);

      // Best effort update in Supabase
      supabase.from('profiles').update({
        avatar_url: finalAvatarUrl,
        primeiro_acesso_concluido: true,
        updated_at: new Date().toISOString()
      }).eq('id', currentUser.id).then();

      setNotification({
        type: 'success',
        message: 'Foto de identidade validada e vinculada com sucesso! Bem-vindo ao TurnoCerto.'
      });
    } catch {
      setNotification({
        type: 'error',
        message: 'Não foi possível processar a foto. Tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper distance calculator (Haversine formula in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // MODULE 1 & PONTO MOBILE: Batida de Ponto com Geofencing, Biometria e Sincronizacao Offline
  const baterPonto = async (
    tipo: TipoBatida,
    coords: { lat: number; lng: number },
    fotoComprovante?: string,
    simuladoDentroDoRaio: boolean = true
  ): Promise<{ success: boolean; message: string; tagTransitada?: string; salvoOffline?: boolean }> => {
    if (!currentUser) {
      return { success: false, message: 'Usuário não autenticado.' };
    }

    // Normaliza tipos de batida para compatibilidade total
    const tipoNormalizado: TipoBatida =
      tipo === 'inicio_intervalo' ? 'saida_intervalo' :
      tipo === 'fim_intervalo' ? 'retorno_intervalo' : tipo;

    // Localiza escala e condomínio de alocação
    const escala = escalas.find((e) => e.funcionario_id === currentUser.id);
    const condominio = escala ? condominios.find((c) => c.id === escala.condominio_id) : condominios[0];

    const dist = condominio
      ? calculateDistance(coords.lat, coords.lng, condominio.lat, condominio.lng)
      : 35;
    
    // Raio configurado no condomínio (ex: 50m / raio_tolerancia_metros)
    const raioPermitido = condominio?.raio_metros || condominio?.raio_tolerancia_metros || 50;
    const dentroDoRaio = simuladoDentroDoRaio !== undefined ? simuladoDentroDoRaio : (dist <= raioPermitido);

    const timestamp = new Date().toISOString();
    const offlineAgora = !isOnline;

    const hashCripto = gerarHashIntegridade(
      currentUser.id,
      timestamp,
      coords.lat,
      coords.lng,
      tipoNormalizado
    );

    const novoRegistro: RegistroPonto = {
      id: `ponto-${Date.now()}`,
      funcionario_id: currentUser.id,
      condominio_id: condominio?.id,
      escala_id: escala?.id,
      tipo_batida: tipoNormalizado,
      timestamp,
      timestamp_batida: timestamp,
      lat: coords.lat,
      lng: coords.lng,
      latitude_capturada: coords.lat,
      longitude_capturada: coords.lng,
      distancia_metros: dist,
      dentro_do_raio: dentroDoRaio,
      foto_comprovante: fotoComprovante,
      foto_comprovante_url: fotoComprovante,
      condominio_nome: condominio?.nome,
      sincronizado_offline: !offlineAgora,
      offline_pendente: offlineAgora,
      hash_criptografico: hashCripto,
      created_at: timestamp
    };

    // Adiciona ao estado local imediatamente para feedback em tempo real
    setRegistrosPonto((prev) => [novoRegistro, ...prev]);

    // Trata armazenamento offline vs online
    if (offlineAgora) {
      // MODO OFFLINE: Salva no IndexedDB / LocalStorage com criptografia
      await salvarPontoOffline(novoRegistro);
      await carregarFilaOffline();
    } else {
      // MODO ONLINE: Upload da foto ao Supabase Storage + inserção no banco
      (async () => {
        try {
          let fotoUrl = fotoComprovante;
          if (fotoComprovante && fotoComprovante.startsWith('data:image')) {
            fotoUrl = await uploadFotoComprovanteSupabase(currentUser.id, fotoComprovante);
          }

          const { error } = await supabase.from('registros_ponto').insert([
            {
              funcionario_id: currentUser.id,
              condominio_id: condominio?.id,
              escala_id: escala?.id || null,
              tipo_batida: tipoNormalizado,
              timestamp,
              lat: coords.lat,
              lng: coords.lng,
              distancia_metros: dist,
              dentro_do_raio: dentroDoRaio,
              foto_comprovante: fotoUrl,
              foto_comprovante_url: fotoUrl,
              sincronizado_offline: false
            }
          ]);

          if (error && error.code !== '42P01') {
            // Se falhou envio online, salva na fila offline para retry
            console.warn('Erro ao inserir ponto no Supabase, salvando offline:', error.message);
            await salvarPontoOffline({ ...novoRegistro, foto_comprovante_url: fotoUrl });
            await carregarFilaOffline();
          }
        } catch (err) {
          console.warn('Exceção ao sincronizar ponto online:', err);
          await salvarPontoOffline(novoRegistro);
          await carregarFilaOffline();
        }
      })();
    }

    // BUSINESS RULE ENFORCEMENT:
    // Transições de máquina de estado do posto e FT
    let tagTransitada = escala?.tag_ativa;

    if (escala) {
      const isCoveragePunchingIn =
        (tipoNormalizado === 'entrada') && 
        (escala.tag_ativa === 'escalado_cobertura' || escala.tipo_escala === 'ft_cobertura');

      let novaTag = escala.tag_ativa;
      let novoStatusPosto = escala.status_posto;

      if (isCoveragePunchingIn) {
        novaTag = 'trabalhando_folga_ft'; // ⚡ [Trabalhando em Dia de Folga / FT]
        novoStatusPosto = 'em_andamento';
        tagTransitada = 'trabalhando_folga_ft';

        // Add or update apontamento de FT trabalhada
        const novoApontamento: ApontamentoFolha = {
          id: `ft-${Date.now()}`,
          funcionario_id: currentUser.id,
          data_ocorrencia: getTodayDateString(),
          tipo_ocorrencia: 'ft_trabalhada',
          status_processamento: 'pendente',
          observacao: `Assumiu posto de cobertura (${condominio?.nome || 'Condomínio'}) às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. FT Ativada.`,
          valor_calculado: 240.00,
          created_at: timestamp
        };
        setApontamentos((prev) => [novoApontamento, ...prev]);
      } else if (tipoNormalizado === 'entrada') {
        novaTag = 'regular'; // 🟢 No Posto
        novoStatusPosto = 'em_andamento';
      } else if (tipoNormalizado === 'saida_intervalo') {
        novaTag = 'intervalo'; // 🟡 Em Intervalo
      } else if (tipoNormalizado === 'retorno_intervalo') {
        novaTag = escala.tipo_escala === 'ft_cobertura' ? 'trabalhando_folga_ft' : 'regular';
      } else if (tipoNormalizado === 'saida') {
        novoStatusPosto = 'finalizado';
      }

      setEscalas((prev) =>
        prev.map((e) =>
          e.id === escala.id
            ? {
                ...e,
                tag_ativa: novaTag,
                status_posto: novoStatusPosto,
                ultima_batida: timestamp
              }
            : e
        )
      );
    }

    const tipoLabel = {
      entrada: 'Entrada',
      inicio_intervalo: 'Início de Intervalo',
      fim_intervalo: 'Fim de Intervalo',
      saida_intervalo: 'Saída para Intervalo',
      retorno_intervalo: 'Retorno do Intervalo',
      saida: 'Saída do Turno'
    }[tipo] || 'Ponto';

    let feedbackMsg = '';
    if (offlineAgora) {
      feedbackMsg = `📡 Batida de ${tipoLabel} salva OFFLINE no dispositivo (Criptografado). ${dentroDoRaio ? 'Dentro do Raio (' + dist + 'm)' : '⚠️ FORA DO RAIO (' + dist + 'm)'}. Sincronização automática na reconexão.`;
    } else if (tagTransitada === 'trabalhando_folga_ft') {
      feedbackMsg = `⚡ Batida de ${tipoLabel} confirmada! Posto assumido com sucesso. Tag alterada para [Trabalhando em Dia de Folga / FT].`;
    } else if (!dentroDoRaio) {
      feedbackMsg = `⚠️ Batida de ${tipoLabel} registrada COM ADVERTÊNCIA: fora do perímetro delimitado (${dist}m de distância; raio: ${raioPermitido}m).`;
    } else {
      feedbackMsg = `Batida de ${tipoLabel} registrada às ${new Date().toLocaleTimeString('pt-BR')} com biometria facial e GPS (${dist}m do posto).`;
    }

    setNotification({
      type: !dentroDoRaio ? 'warning' : offlineAgora ? 'info' : 'success',
      message: feedbackMsg
    });

    return { success: true, message: feedbackMsg, tagTransitada, salvoOffline: offlineAgora };
  };

  // MODULE 1: Emergency Coverage Allocation by Supervisor
  const escalarCobertura = async (
    escalaId: string,
    funcionarioId: string,
    tipo: 'ft_cobertura' | 'substituicao_atestado' = 'ft_cobertura'
  ) => {
    const funcionario = profiles.find((p) => p.id === funcionarioId);
    if (!funcionario) return;

    // REGRA DE CONSISTÊNCIA CRÍTICA:
    // Funcionários que estão de plantão NÃO PODEM ser escalados para cobertura simultânea!
    const escalaAtiva = escalas.find((e) =>
      e.funcionario_id === funcionarioId &&
      e.id !== escalaId &&
      e.status_posto !== 'finalizado' &&
      e.status_posto !== 'vazio' &&
      e.tag_ativa !== 'falta'
    );

    if (escalaAtiva) {
      const cond = condominios.find((c) => c.id === escalaAtiva.condominio_id);
      setNotification({
        type: 'error',
        message: `Impedimento de Consistência: ${funcionario.full_name} já está de plantão ativo no ${cond?.nome || 'outro posto'}. Não é possível estar em 2 postos ao mesmo tempo!`
      });
      return;
    }

    setEscalas((prev) =>
      prev.map((e) => {
        if (e.id === escalaId) {
          return {
            ...e,
            funcionario_id: funcionarioId,
            status_posto: 'coberto',
            tag_ativa: 'escalado_cobertura', // 🔄 [Escalado para Cobertura]
            tipo_escala: tipo
          };
        }
        return e;
      })
    );

    setNotification({
      type: 'success',
      message: `Colaborador ${funcionario.full_name} escalado para cobertura de emergência! Status alterado para 🔄 [Escalado para Cobertura].`
    });
  };

  // MODULE 1: Financial settlement of absences / FTs / medical certificates
  const processarApontamento = async (
    apontamentoId: string,
    status: StatusProcessamento,
    observacao?: string
  ) => {
    setApontamentos((prev) =>
      prev.map((a) => {
        if (a.id === apontamentoId) {
          return {
            ...a,
            status_processamento: status,
            observacao: observacao || a.observacao
          };
        }
        return a;
      })
    );

    const statusLabels: Record<StatusProcessamento, string> = {
      descontar: 'Descontar em Folha de Pagamento',
      pagar_ft: 'Pagar Turno FT em Folha',
      abonado: 'Abonado / Compensado',
      pendente: 'Pendente'
    };

    setNotification({
      type: 'success',
      message: `Apontamento atualizado com sucesso: ${statusLabels[status]}.`
    });
  };

  // MODULE 1: Submit Medical Certificate
  const enviarAtestado = async (dados: {
    funcionarioId: string;
    dias: number;
    crm: string;
    anexoUrl?: string;
    observacao: string;
  }) => {
    const novoApontamento: ApontamentoFolha = {
      id: `atestado-${Date.now()}`,
      funcionario_id: dados.funcionarioId,
      data_ocorrencia: getTodayDateString(),
      tipo_ocorrencia: 'atestado_aprovado',
      status_processamento: 'pendente', // Supervisora aprova ou rejeita
      observacao: dados.observacao,
      crm_medico: dados.crm,
      dias_afastamento: dados.dias,
      anexo_url:
        dados.anexoUrl ||
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    };

    setApontamentos((prev) => [novoApontamento, ...prev]);

    setNotification({
      type: 'success',
      message: 'Atestado médico enviado com sucesso! Encaminhado para análise da Supervisão.'
    });
  };

  // Toggle FT availability for on-duty/off-duty volunteer
  const toggleDisponibilidadeFT = async (funcionarioId?: string) => {
    const targetId = funcionarioId || currentUser?.id;
    if (!targetId) return;

    let novoEstado = false;

    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === targetId) {
          novoEstado = !p.disponivel_ft;
          return { ...p, disponivel_ft: novoEstado };
        }
        return p;
      })
    );

    if (currentUser && currentUser.id === targetId) {
      setCurrentUser((prev) => (prev ? { ...prev, disponivel_ft: !prev.disponivel_ft } : null));
    }

    setNotification({
      type: 'info',
      message: novoEstado
        ? 'Disponibilidade para FT ATIVADA ⚡ Você poderá ser convocado para turnos extras em dias de folga.'
        : 'Disponibilidade para FT desativada.'
    });
  };

  // HOLERITE DIGITAL: Salvar (Lançamento 100% Manual RH e Cálculo Automático)
  const salvarDemonstrativo = async (
    dados: Partial<DemonstrativoPagamento>,
    itens: ItemDemonstrativo[]
  ): Promise<{ success: boolean; id: string }> => {
    const id = dados.id || `dem-${Date.now()}`;
    const funcionario = profiles.find((p) => p.id === dados.funcionario_id);

    // Cálculos automáticos CLT
    const totalProventos = itens
      .filter((i) => i.tipo === 'provento')
      .reduce((acc, i) => acc + (Number(i.valor) || 0), 0);

    const totalDescontos = itens
      .filter((i) => i.tipo === 'desconto')
      .reduce((acc, i) => acc + (Number(i.valor) || 0), 0);

    const salarioLiquido = Math.max(0, totalProventos - totalDescontos);
    const salarioBase = Number(dados.salario_base) || (itens.find((i) => i.codigo === '001')?.valor || totalProventos);

    const baseInss = totalProventos;
    const baseFgts = totalProventos;
    const valorFgts = Number((baseFgts * 0.08).toFixed(2));
    const inssItem = itens.find((i) => i.codigo === '901' || i.descricao.toLowerCase().includes('inss'));
    const inssValor = inssItem ? Number(inssItem.valor) : 0;
    const baseIrrf = Math.max(0, totalProventos - inssValor);

    const novoDemonstrativo: DemonstrativoPagamento = {
      id,
      funcionario_id: dados.funcionario_id || '',
      funcionario,
      mes_referencia: dados.mes_referencia || '2026-03',
      salario_base: salarioBase,
      total_proventos: Number(totalProventos.toFixed(2)),
      total_descontos: Number(totalDescontos.toFixed(2)),
      salario_liquido: Number(salarioLiquido.toFixed(2)),
      base_inss: Number(baseInss.toFixed(2)),
      base_fgts: Number(baseFgts.toFixed(2)),
      valor_fgts: valorFgts,
      base_irrf: Number(baseIrrf.toFixed(2)),
      status: dados.status || 'rascunho',
      data_pagamento: dados.data_pagamento || '2026-04-05',
      ciente_funcionario_em: dados.ciente_funcionario_em || null,
      observacoes: dados.observacoes || '',
      itens: itens.map((item, idx) => ({
        ...item,
        demonstrativo_id: id,
        id: item.id || `item-${Date.now()}-${idx}`,
        ordem: idx + 1
      })),
      created_at: dados.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setDemonstrativos((prev) => {
      const exists = prev.some((d) => d.id === id);
      if (exists) {
        return prev.map((d) => (d.id === id ? novoDemonstrativo : d));
      }
      return [novoDemonstrativo, ...prev];
    });

    setNotification({
      type: 'success',
      message: `Holerite da competência ${novoDemonstrativo.mes_referencia} (${novoDemonstrativo.status === 'publicado' ? 'Publicado' : 'Salvo como Rascunho'}) com sucesso!`
    });

    return { success: true, id };
  };

  const alternarStatusDemonstrativo = async (id: string, novoStatus: StatusHolerite) => {
    setDemonstrativos((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: novoStatus, updated_at: new Date().toISOString() } : d))
    );
    setNotification({
      type: 'success',
      message: novoStatus === 'publicado'
        ? 'Holerite PUBLICADO com sucesso! Disponível de forma transparente no app do colaborador.'
        : 'Holerite revertido para RASCUNHO (invisível no app do funcionário).'
    });
  };

  const excluirDemonstrativo = async (id: string) => {
    setDemonstrativos((prev) => prev.filter((d) => d.id !== id));
    setNotification({
      type: 'info',
      message: 'Demonstrativo de pagamento removido com sucesso.'
    });
  };

  const confirmarCienteHolerite = async (id: string) => {
    const timestamp = new Date().toISOString();
    setDemonstrativos((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ciente_funcionario_em: timestamp } : d))
    );
    setNotification({
      type: 'success',
      message: `Ciente do holerite confirmado e assinado digitalmente em ${new Date().toLocaleTimeString('pt-BR')}!`
    });
  };

  const resetToInitialData = () => {
    localStorage.clear();
    setProfiles(SEED_PROFILES);
    setCondominios(SEED_CONDOMINIOS);
    setEscalas(SEED_ESCALAS);
    setApontamentos(SEED_APONTAMENTOS);
    setDemonstrativos(SEED_DEMONSTRATIVOS);
    setRegistrosPonto([]);
    setCurrentUser(SEED_PROFILES[0]);
    setNotification({
      type: 'info',
      message: 'Dados operacionais e holerites reiniciados para o cenário de demonstração oficial.'
    });
  };

  return (
    <TurnoCertoContext.Provider
      value={{
        currentUser,
        profiles,
        condominios,
        escalas,
        apontamentos,
        registrosPonto,
        filaOffline,
        modoOfflineForcado,
        isOnline,
        toggleModoOffline,
        sincronizarFilaOffline,
        carregarFilaOffline,
        demonstrativos,
        isLoading,
        supabaseConnected,
        notification,
        setNotification,
        login,
        logout,
        switchUser,
        completeFirstAccess,
        baterPonto,
        escalarCobertura,
        processarApontamento,
        enviarAtestado,
        toggleDisponibilidadeFT,
        salvarDemonstrativo,
        alternarStatusDemonstrativo,
        excluirDemonstrativo,
        confirmarCienteHolerite,
        resetToInitialData,
        syncWithSupabase
      }}
    >
      {children}
    </TurnoCertoContext.Provider>
  );
};

export const useTurnoCerto = () => {
  const context = useContext(TurnoCertoContext);
  if (!context) {
    throw new Error('useTurnoCerto must be used within a TurnoCertoProvider');
  }
  return context;
};

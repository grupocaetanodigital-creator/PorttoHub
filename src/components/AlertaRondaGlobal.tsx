import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { registrarAtividade } from '../services/auditoriaService';
import { 
  Timer, 
  ShieldAlert, 
  QrCode, 
  X, 
  BellOff, 
  ArrowRight, 
  AlertTriangle, 
  PlayCircle,
  VolumeX,
  Volume2,
  Clock,
  ShieldCheck,
  Check,
  HardHat,
  Key,
  UserCheck
} from 'lucide-react';

interface AlertaRondaGlobalProps {
  onNavegarRondas?: () => void;
  onNavegarModulo?: (modulo: string) => void;
  usuarioLogado?: any;
  condominioId?: string;
  condominioAtivo?: any;
  moduloRondaHabilitado?: boolean;
}

const CHAVE_MUTE_ADM = 'infport_mute_alerta_global_adm_v1';

export default function AlertaRondaGlobal({ 
  onNavegarRondas, 
  onNavegarModulo,
  usuarioLogado, 
  condominioId, 
  condominioAtivo,
  moduloRondaHabilitado
}: AlertaRondaGlobalProps) {
  const idCondominioAtivo = condominioId || condominioAtivo?.id || usuarioLogado?.condominio_id || usuarioLogado?.condominio?.id;
  const eAdmin = usuarioLogado?.perfil === 'admin' || usuarioLogado?.nivel_acesso === 0 || usuarioLogado?.perfil === 'master' || usuarioLogado?.nivel_acesso === 1;

  const [moduloRondaAtivo, setModuloRondaAtivo] = useState(
    moduloRondaHabilitado !== undefined ? moduloRondaHabilitado : false
  );
  const [temPontosRonda, setTemPontosRonda] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(15 * 60);
  const [tempoAtrasado, setTempoAtrasado] = useState(0);
  const [statusRonda, setStatusRonda] = useState<'aguardando' | 'atrasada' | 'em_andamento'>('aguardando');
  const [alertaDisparado, setAlertaDisparado] = useState(false);
  const [silenciadoAte, setSilenciadoAte] = useState<number | null>(null);

  // Monitoramento Global de Prestadores Estourados e Chaves Atrasadas
  const [prestadoresEstourados, setPrestadoresEstourados] = useState<any[]>([]);
  const [chavesAtrasadas, setChavesAtrasadas] = useState<any[]>([]);

  // Controle de Mute exclusivo para Administrador
  const [muteAdmTimestamp, setMuteAdmTimestamp] = useState<number | null>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_MUTE_ADM);
      if (salvo) {
        const val = parseInt(salvo, 10);
        if (val > Date.now()) return val;
      }
    } catch {}
    return null;
  });
  const [modalMuteAberto, setModalMuteAberto] = useState(false);

  const proximaRondaTimestampRef = useRef<number | null>(null);
  const rondaEmAndamentoRef = useRef(false);
  const ultimoBeepGlobalRef = useRef<number>(0);

  // Calcula se o mute de administrador está ativo agora
  const muteAdmAtivo = muteAdmTimestamp !== null && muteAdmTimestamp > Date.now();
  const minutosRestantesMute = muteAdmTimestamp ? Math.max(0, Math.ceil((muteAdmTimestamp - Date.now()) / 60000)) : 0;

  useEffect(() => {
    if (moduloRondaHabilitado !== undefined) {
      setModuloRondaAtivo(moduloRondaHabilitado);
      if (!moduloRondaHabilitado) {
        setAlertaDisparado(false);
      }
      return;
    }

    if (!idCondominioAtivo) {
      setModuloRondaAtivo(false);
      return;
    }

    let isMounted = true;

    const verificarEAtualizarAlerta = async () => {
      try {
        const { data: configData, error: configError } = await supabase
          .from('configuracoes')
          .select('mod07_gestao_ronda, feature_flags')
          .eq('condominio_id', idCondominioAtivo)
          .maybeSingle();

        let estaAtivo = false;

        if (!configError && configData) {
          if (configData.mod07_gestao_ronda !== undefined && configData.mod07_gestao_ronda !== null) {
            estaAtivo = Boolean(configData.mod07_gestao_ronda);
          } else if (configData.feature_flags && typeof configData.feature_flags === 'object') {
            const flags = configData.feature_flags as Record<string, any>;
            estaAtivo = Boolean(flags.mod07_gestao_ronda ?? false);
          }
        }

        if (!isMounted) return;
        setModuloRondaAtivo(estaAtivo);

        if (!estaAtivo) {
          setAlertaDisparado(false);
          return;
        }
      } catch (err) {
        console.error('Erro ao checar status no Supabase:', err);
      }
    };

    verificarEAtualizarAlerta();

    const intervalConfig = setInterval(verificarEAtualizarAlerta, 30000);
    return () => {
      isMounted = false;
      clearInterval(intervalConfig);
    };
  }, [idCondominioAtivo, moduloRondaHabilitado]);

  // Monitoramento contínuo: Rondas + Permanência de Prestadores + Chaves Atrasadas
  useEffect(() => {
    if (!idCondominioAtivo) return;

    let isMounted = true;

    const checarStatusGlobal = async () => {
      try {
        const agora = Date.now();

        // 1. Checa Rondas
        if (moduloRondaAtivo) {
          // Checa primeiro se o condomínio possui pontos de ronda cadastrados
          const { count: totalPontos } = await supabase
            .from('rondas_pontos')
            .select('id', { count: 'exact', head: true })
            .eq('condominio_id', idCondominioAtivo);

          if (!isMounted) return;

          const temPontos = (totalPontos || 0) > 0;
          setTemPontosRonda(temPontos);

          if (!temPontos) {
            setStatusRonda('aguardando');
            setAlertaDisparado(false);
          } else {
            const { data: emAndamento } = await supabase
              .from('rondas_execucao')
              .select('id, hora_inicio')
              .eq('condominio_id', idCondominioAtivo)
              .is('hora_fim', null)
              .order('hora_inicio', { ascending: false })
              .limit(1);

            if (!isMounted) return;

            if (emAndamento && emAndamento.length > 0) {
              rondaEmAndamentoRef.current = true;
              setStatusRonda('em_andamento');
              setAlertaDisparado(false);
            } else {
              rondaEmAndamentoRef.current = false;
              const { data: ultimaRonda } = await supabase
                .from('rondas_execucao')
                .select('id, hora_fim')
                .eq('condominio_id', idCondominioAtivo)
                .not('hora_fim', 'is', null)
                .order('hora_fim', { ascending: false })
                .limit(1);

              let baseTimestamp = agora;
              if (ultimaRonda && ultimaRonda.length > 0 && ultimaRonda[0].hora_fim) {
                baseTimestamp = new Date(ultimaRonda[0].hora_fim).getTime();
                proximaRondaTimestampRef.current = baseTimestamp + 15 * 60 * 1000;
              } else {
                // Se nunca foi executada nenhuma ronda no condomínio, não gera atraso automático agressivo
                proximaRondaTimestampRef.current = agora + 60 * 60 * 1000;
              }
            }
          }
        } else {
          setTemPontosRonda(false);
        }

        // 2. Checa Prestadores com permanência interna estourada
        // Apenas prestadores (não autorizados/família) que estão DENTRO e o limite passou
        try {
          const { data: prestadoresData } = await supabase
            .from('prestadores')
            .select('id, nome_profissional, unidade, bloco, limite_permanencia_ate, perfil_acesso, cracha_atribuido')
            .eq('condominio_id', idCondominioAtivo)
            .eq('status_acesso', 'DENTRO');

          if (isMounted && prestadoresData) {
            const estourados = prestadoresData.filter((p: any) => {
              if (p.perfil_acesso === 'autorizado') return false; // Visitantes/Família não têm limite
              if (!p.limite_permanencia_ate) return false;
              return new Date(p.limite_permanencia_ate).getTime() < agora;
            });
            setPrestadoresEstourados(estourados);
          }
        } catch {}

        // 3. Checa Chaves com devolução atrasada
        try {
          const { data: chavesData } = await supabase
            .from('movimentacao_chaves')
            .select('id, previsao_devolucao, chaves(codigo_chave, nome_chave)')
            .eq('condominio_id', idCondominioAtivo)
            .eq('status', 'Em Andamento');

          if (isMounted && chavesData) {
            const atrasadas = chavesData.filter((c: any) => {
              if (!c.previsao_devolucao) return false;
              return new Date(c.previsao_devolucao).getTime() < agora;
            });
            setChavesAtrasadas(atrasadas);
          }
        } catch {}

      } catch (e) {
        console.error('Erro ao checar status global:', e);
      }
    };

    checarStatusGlobal();
    const intervalGlobal = setInterval(checarStatusGlobal, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalGlobal);
    };
  }, [moduloRondaAtivo, idCondominioAtivo]);

  // Timer do relógio da ronda e beeps de alerta global
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const agora = Date.now();

      // Checa se o mute do ADM expirou
      if (muteAdmTimestamp && agora >= muteAdmTimestamp) {
        setMuteAdmTimestamp(null);
        localStorage.removeItem(CHAVE_MUTE_ADM);
      }

      // 1. Rondas
      if (moduloRondaAtivo) {
        if (rondaEmAndamentoRef.current) {
          setStatusRonda('em_andamento');
          setAlertaDisparado(false);
        } else {
          const proxima = proximaRondaTimestampRef.current || (agora + 15 * 60 * 1000);
          const diffSegundos = Math.floor((proxima - agora) / 1000);

          if (diffSegundos > 0) {
            setStatusRonda('aguardando');
            setTempoRestante(diffSegundos);
            setTempoAtrasado(0);
            setAlertaDisparado(false);
          } else {
            setStatusRonda('atrasada');
            setTempoRestante(0);
            setTempoAtrasado(Math.abs(diffSegundos));

            const estaSilenciado = (silenciadoAte && agora < silenciadoAte) || (muteAdmTimestamp && agora < muteAdmTimestamp);
            if (!estaSilenciado) {
              setAlertaDisparado(true);
            } else {
              setAlertaDisparado(false);
            }
          }
        }
      }

      // 2. Beep sonoro global: dispara se ronda estiver atrasada OU se houver prestador/chave atrasados
      const temAlertaCritico = 
        (statusRonda === 'atrasada' && !silenciadoAte) || 
        prestadoresEstourados.length > 0 || 
        chavesAtrasadas.length > 0;

      if (temAlertaCritico && !muteAdmAtivo) {
        if (agora - ultimoBeepGlobalRef.current > 20000) {
          dispararBeepSonoro();
          ultimoBeepGlobalRef.current = agora;
        }
      }

    }, 1000);

    return () => clearInterval(timerInterval);
  }, [moduloRondaAtivo, silenciadoAte, muteAdmTimestamp, statusRonda, prestadoresEstourados.length, chavesAtrasadas.length]);

  const dispararBeepSonoro = () => {
    if (muteAdmTimestamp && Date.now() < muteAdmTimestamp) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();

      const emitirBeep = (freq: number, duracao: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duracao);
      };

      emitirBeep(880, 0.15);
      setTimeout(() => emitirBeep(880, 0.15), 250);
      setTimeout(() => emitirBeep(1100, 0.3), 500);
    } catch {}
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const handleIrParaRondas = () => {
    setAlertaDisparado(false);
    setSilenciadoAte(Date.now() + 10 * 60 * 1000);
    if (onNavegarModulo) onNavegarModulo('rondas');
    else if (onNavegarRondas) onNavegarRondas();
  };

  const handleIrParaPrestadores = () => {
    if (onNavegarModulo) onNavegarModulo('prestadores');
  };

  const handleIrParaChaves = () => {
    if (onNavegarModulo) onNavegarModulo('chaves');
  };

  const handleAdiar15Min = () => {
    setAlertaDisparado(false);
    setSilenciadoAte(Date.now() + 15 * 60 * 1000);
  };

  // Funções de Mute ADM
  const aplicarMuteAdm = async (minutos: number) => {
    const ate = Date.now() + minutos * 60 * 1000;
    setMuteAdmTimestamp(ate);
    localStorage.setItem(CHAVE_MUTE_ADM, ate.toString());
    setAlertaDisparado(false);
    setModalMuteAberto(false);

    const opNome = usuarioLogado?.nome || usuarioLogado?.login || 'Administrador';
    await registrarAtividade({
      modulo: 'Sistema',
      acao: 'MUTE_ALERTA',
      descricao: `Administrador ${opNome} silenciou os alertas sonoros do sistema por ${minutos} minutos.`,
      detalhes: { duracaoMinutos: minutos, silenciadoAte: new Date(ate).toISOString() },
      operador_nome: opNome,
      condominio_id: idCondominioAtivo
    });
  };

  const desativarMuteAdm = async () => {
    setMuteAdmTimestamp(null);
    localStorage.removeItem(CHAVE_MUTE_ADM);
    setModalMuteAberto(false);

    const opNome = usuarioLogado?.nome || usuarioLogado?.login || 'Administrador';
    await registrarAtividade({
      modulo: 'Sistema',
      acao: 'MUTE_ALERTA',
      descricao: `Administrador ${opNome} reativou os alertas sonoros.`,
      detalhes: { status: 'reativado' },
      operador_nome: opNome,
      condominio_id: idCondominioAtivo
    });
  };

  const rondaAtiva = Boolean(idCondominioAtivo) && temPontosRonda && (moduloRondaHabilitado !== undefined ? moduloRondaHabilitado : moduloRondaAtivo);

  // Se o módulo de ronda estiver desativado e não houver prestadores nem chaves estouradas, não renderiza nada
  if (!rondaAtiva && prestadoresEstourados.length === 0 && chavesAtrasadas.length === 0) {
    return null;
  }

  return (
    <>
      {/* BARRA SUPERIOR DE ALERTAS GLOBAIS (Ronda, Prestadores, Chaves e Mute) */}
      <div className={`w-full px-3 py-1 flex items-center justify-between text-[11px] font-bold shadow-xs sticky top-0 z-40 transition-colors flex-wrap gap-2 ${
        prestadoresEstourados.length > 0 || chavesAtrasadas.length > 0 || (rondaAtiva && statusRonda === 'atrasada')
          ? 'bg-red-600 text-white'
          : rondaAtiva && statusRonda === 'em_andamento'
          ? 'bg-emerald-600 text-white'
          : rondaAtiva
          ? 'bg-amber-500 text-slate-950'
          : 'bg-slate-900 text-white'
      }`}>
        <div className="flex items-center gap-2 truncate flex-wrap">
          {/* Status da Ronda (Apenas se o módulo de ronda estiver ativo) */}
          {rondaAtiva && (
            statusRonda === 'em_andamento' ? (
              <div className="flex items-center gap-1.5 truncate">
                <PlayCircle className="w-3.5 h-3.5 animate-spin text-emerald-200 shrink-0" />
                <span className="truncate">Ronda em Andamento</span>
              </div>
            ) : statusRonda === 'atrasada' ? (
              <div className="flex items-center gap-1.5 truncate">
                <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0 animate-bounce" />
                <span className="truncate font-black">Ronda Atrasada / Pendente</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <Timer className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                <span className="truncate">Próxima Ronda</span>
              </div>
            )
          )}

          {/* Badge: Prestador Estourado */}
          {prestadoresEstourados.length > 0 && (
            <button
              type="button"
              onClick={handleIrParaPrestadores}
              className="bg-slate-950 text-amber-300 border border-amber-400/50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 animate-pulse hover:bg-slate-900 cursor-pointer"
              title="Clique para ir ao módulo de Autorizados/Prestadores"
            >
              <HardHat className="w-3 h-3 text-amber-400" />
              <span>{prestadoresEstourados.length} Prestador(es) Estourado(s)!</span>
            </button>
          )}

          {/* Badge: Chave Atrasada */}
          {chavesAtrasadas.length > 0 && (
            <button
              type="button"
              onClick={handleIrParaChaves}
              className="bg-slate-950 text-indigo-300 border border-indigo-400/50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 animate-pulse hover:bg-slate-900 cursor-pointer"
              title="Clique para ir ao Quadro de Chaves"
            >
              <Key className="w-3 h-3 text-indigo-400" />
              <span>{chavesAtrasadas.length} Chave(s) Atrasada(s)!</span>
            </button>
          )}

          {/* Indicador de Mute ADM Ativo */}
          {muteAdmAtivo && (
            <span 
              onClick={() => eAdmin && setModalMuteAberto(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950/80 text-amber-300 border border-amber-400/40 cursor-pointer shadow-xs"
            >
              <VolumeX className="w-3 h-3 text-amber-400" />
              <span>Mudo ADM ({minutosRestantesMute}m)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {rondaAtiva && (
            <div className="bg-slate-950 text-white font-mono px-2 py-0.5 rounded text-[10px] sm:text-xs border border-slate-700">
              {statusRonda === 'em_andamento'
                ? 'EM MARCHA'
                : statusRonda === 'atrasada'
                ? `+${formatarTempo(tempoAtrasado)}`
                : formatarTempo(tempoRestante)}
            </div>
          )}

          {/* BOTÃO EXCLUSIVO DE MUTE PARA ADMINISTRADOR (ADM) */}
          {eAdmin && (
            <button
              type="button"
              onClick={() => setModalMuteAberto(true)}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition flex items-center gap-1 shadow-xs cursor-pointer ${
                muteAdmAtivo
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 border border-amber-500'
                  : 'bg-slate-900/90 text-slate-200 hover:bg-slate-950 border border-slate-700'
              }`}
              title="Silenciar / Mutar alertas (Acesso exclusivo para Administrador)"
            >
              {muteAdmAtivo ? <VolumeX className="w-3 h-3 text-slate-950" /> : <Volume2 className="w-3 h-3" />}
              <span className="hidden md:inline">Mute ADM</span>
            </button>
          )}

          {rondaAtiva && (
            <button
              onClick={handleIrParaRondas}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition flex items-center gap-1 shadow-xs cursor-pointer ${
                statusRonda === 'atrasada'
                  ? 'bg-white text-red-700 hover:bg-slate-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-3 h-3" />
              <span>Rondas</span>
            </button>
          )}
        </div>
      </div>

      {/* POPUP DE ALERTA DE RONDA ATRASADA */}
      {alertaDisparado && !muteAdmAtivo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl border-4 border-red-600 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={handleAdiar15Min}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition cursor-pointer"
              title="Fechar janela de alerta"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div>
              <span className="bg-red-100 text-red-800 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider border border-red-200">
                Alerta de Segurança Patrimonial
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 uppercase leading-tight">
                Hora de Iniciar a Próxima Ronda!
              </h2>
              <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                Passaram-se mais de <strong>15 minutos</strong> desde a última ronda. Realize a varredura nos pontos cadastrados da portaria.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleIrParaRondas}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition shadow-lg active:scale-95 cursor-pointer"
              >
                IR PARA TELA DE RONDAS E INICIAR <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleAdiar15Min}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <BellOff className="w-4 h-4 text-slate-500" />
                Lembrar mais tarde (Adiar 15 min)
              </button>

              {eAdmin && (
                <button
                  type="button"
                  onClick={() => setModalMuteAberto(true)}
                  className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-black py-2.5 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 transition border border-amber-300 cursor-pointer"
                >
                  <VolumeX className="w-4 h-4 text-amber-700" />
                  Silenciar Todos os Alertas (Exclusivo ADM)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE MUTE PARA O ADMINISTRADOR */}
      {modalMuteAberto && eAdmin && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                  <VolumeX className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white uppercase tracking-tight">
                    Mute de Alertas (ADM)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Silencia avisos de Rondas, Prestadores e Chaves
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalMuteAberto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Silencie os avisos sonoros e popups temporariamente durante manutenções autorizadas, reuniões ou troca de turno.
            </p>

            {muteAdmAtivo ? (
              <div className="bg-amber-950/60 border border-amber-500/40 p-3.5 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span>Mute ativo no momento:</span>
                  <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                    {minutosRestantesMute} minutos restantes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={desativarMuteAdm}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Reativar Alertas Sonoros Agora</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-slate-400 uppercase">
                  Escolha a duração do silenciamento:
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(15)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    15 minutos
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(30)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    30 minutos
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(60)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    1 hora
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(240)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    4 horas
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalMuteAberto(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

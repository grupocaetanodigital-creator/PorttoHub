import { supabase } from './supabase';
import { registrarAtividade } from './auditoriaService';

export interface LembretePortaria {
  id: string;
  condominio_id: string;
  unidade_bloco: string; // Ex: "Apto 102 - Bloco B" ou "Geral / ADM"
  remetente_tipo: 'morador' | 'portaria' | 'supervisao' | 'sindico' | 'adm';
  remetente_nome?: string;
  mensagem: string;
  tipo: 'Palavra-chave' | 'Instrução' | 'Aviso Geral' | 'Correspondência Urgente' | 'Autorização' | 'Lembrete do ADM' | string;
  lido: boolean; // Marcado como ciente
  lido_em?: string | null;
  lido_por_nome?: string | null;
  lido_por_id?: string | null;
  finalizado: boolean; // Concluído / baixado
  finalizado_em?: string | null;
  finalizado_por_nome?: string | null;
  finalizado_por_id?: string | null;
  eh_adm?: boolean; // Lembrete oficial emitido pelo Nível 0 (Administrador)
  data_limite?: string | null; // Data/hora limite de expiração configurada pelo ADM
  created_at: string;
  updated_at?: string;
}

export interface StatusContagemLembretes {
  total: number;
  totalAtivos: number; // Não finalizados
  pendentesNaoLidos: number; // !lido && !finalizado (piscando laranja)
  pendentesCientes: number; // lido && !finalizado (piscando azul)
  ativosAdm: number; // eh_adm && !finalizado (piscando vermelho)
  finalizados: number; // finalizado === true
  corAlerta: 'vermelho' | 'laranja' | 'azul' | 'neutro';
}

const CACHE_PREFIX = 'infport_lembretes_cache_';
const SOUND_ENABLED_KEY = 'infport_lembretes_sound_enabled';
const ALARME_TROCA_KEY = 'infport_alarme_troca_plantao';

let alarmeAudioIntervalo: any = null;

/**
 * Retorna se o alerta sonoro para novos recados está habilitado
 */
export function isSomHabilitado(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(SOUND_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

/**
 * Salva preferência do alerta sonoro
 */
export function setSomHabilitado(habilitado: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SOUND_ENABLED_KEY, String(habilitado));
  }
}

/**
 * Dispara um bip suave e agradável usando Web Audio API (não depende de MP3 externo)
 */
export function reproduzirSinalSonoroAviso(): void {
  if (typeof window === 'undefined' || !isSomHabilitado()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const agora = ctx.currentTime;

    // Primeiro tom suave (659Hz - E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, agora);
    gain1.gain.setValueAtTime(0.12, agora);
    gain1.gain.exponentialRampToValueAtTime(0.001, agora + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(agora);
    osc1.stop(agora + 0.22);

    // Segundo tom harmônico (880Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, agora + 0.12);
    gain2.gain.setValueAtTime(0.15, agora + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, agora + 0.40);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(agora + 0.12);
    osc2.stop(agora + 0.40);
  } catch {
    // Silencia erros de permissão de autoplay no navegador
  }
}

/**
 * Dispara sinal sonoro contínuo e mais incisivo para a Troca de Plantão
 */
export function tocarBipAlertaTrocaPlantao(): void {
  if (typeof window === 'undefined' || !isSomHabilitado()) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const agora = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, agora); // D5
    osc.frequency.setValueAtTime(880, agora + 0.14); // A5
    gain.gain.setValueAtTime(0.18, agora);
    gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(agora);
    osc.stop(agora + 0.35);
  } catch {}
}

/**
 * Inicia o alarme sonoro contínuo de troca de plantão (repete até o operador clicar no ícone)
 */
export function iniciarAlarmeTrocaPlantao(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALARME_TROCA_KEY, 'true');
  tocarBipAlertaTrocaPlantao();
  if (alarmeAudioIntervalo) clearInterval(alarmeAudioIntervalo);
  alarmeAudioIntervalo = setInterval(() => {
    tocarBipAlertaTrocaPlantao();
  }, 3500);

  window.dispatchEvent(new CustomEvent('alarme_troca_plantao_mudou', { detail: { ativo: true } }));
}

/**
 * Para imediatamente o alarme sonoro de troca de plantão
 */
export function pararAlarmeTrocaPlantao(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ALARME_TROCA_KEY);
  if (alarmeAudioIntervalo) {
    clearInterval(alarmeAudioIntervalo);
    alarmeAudioIntervalo = null;
  }
  window.dispatchEvent(new CustomEvent('alarme_troca_plantao_mudou', { detail: { ativo: false } }));
}

/**
 * Retorna se o alarme contínuo de troca de plantão está ativo
 */
export function isAlarmeTrocaPlantaoAtivo(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ALARME_TROCA_KEY) === 'true';
}

/**
 * Retoma o áudio do alarme se ele estiver ativo no storage
 */
export function retomarAlarmeSeAtivo(): void {
  if (typeof window === 'undefined') return;
  if (isAlarmeTrocaPlantaoAtivo() && !alarmeAudioIntervalo) {
    tocarBipAlertaTrocaPlantao();
    alarmeAudioIntervalo = setInterval(() => {
      tocarBipAlertaTrocaPlantao();
    }, 3500);
  }
}

/**
 * Toda vez que houver troca de plantão, se tiver algum lembrete ativo,
 * o app dispara um alerta contínuo que só para quando o operador aperta no ícone de lembretes.
 */
export async function checarEDispararAlarmeTrocaPlantao(condominioId: string): Promise<boolean> {
  if (!condominioId) return false;
  try {
    const { lembretes } = await buscarLembretes(condominioId);
    const status = obterStatusContagem(lembretes);
    if (status.totalAtivos > 0) {
      iniciarAlarmeTrocaPlantao();
      return true;
    }
  } catch (err) {
    console.warn('Erro ao checar lembretes na troca de plantão:', err);
  }
  return false;
}

/**
 * Dispara evento global para que o cabeçalho e componentes sincronizem imediatamente
 */
export function notificarAtualizacaoLembretes(condominioId?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lembretes_portaria_atualizados', {
        detail: { condominioId, timestamp: Date.now() }
      })
    );
  }
}

const FINALIZADOS_REGISTRY_PREFIX = 'infport_lembretes_finalizados_reg_';

/**
 * Registro local persistente de lembretes finalizados para garantir imunidade
 * a recarregamentos ou tabelas sem a coluna "finalizado" no Supabase.
 */
function obterFinalizadosRegistry(condominioId: string): Record<string, { finalizado_em: string; finalizado_por_nome: string; finalizado_por_id?: string | null }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${FINALIZADOS_REGISTRY_PREFIX}${condominioId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function registrarFinalizado(condominioId: string, id: string, nome: string, idOp?: string | null, dataIso?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const reg = obterFinalizadosRegistry(condominioId);
    reg[id] = {
      finalizado_em: dataIso || new Date().toISOString(),
      finalizado_por_nome: nome,
      finalizado_por_id: idOp || null
    };
    localStorage.setItem(`${FINALIZADOS_REGISTRY_PREFIX}${condominioId}`, JSON.stringify(reg));
  } catch (err) {
    console.warn('Erro ao registrar lembrete finalizado:', err);
  }
}

function removerFinalizado(condominioId: string, id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const reg = obterFinalizadosRegistry(condominioId);
    if (reg[id]) {
      delete reg[id];
      localStorage.setItem(`${FINALIZADOS_REGISTRY_PREFIX}${condominioId}`, JSON.stringify(reg));
    }
  } catch {}
}

/**
 * Cache local persistente para uso offline ou enquanto o banco ainda não recebeu a migration
 */
function obterLembretesCache(condominioId: string): LembretePortaria[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${condominioId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function salvarLembretesCache(condominioId: string, lembretes: LembretePortaria[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${condominioId}`, JSON.stringify(lembretes));
  } catch (err) {
    console.warn('Erro ao salvar cache de lembretes:', err);
  }
}

/**
 * Normaliza um item garantindo a presença de todos os campos do ciclo de vida
 * e identificando se foi finalizado por coluna, por metadados ou pelo registro local
 */
function normalizarLembrete(raw: any, condominioId?: string): LembretePortaria {
  const agora = Date.now();
  const idCondo = condominioId || raw.condominio_id || '';
  const regFinalizados = idCondo ? obterFinalizadosRegistry(idCondo) : {};
  const dadosReg = raw.id ? regFinalizados[raw.id] : undefined;

  const rawTipo = String(raw.tipo || '');
  const rawNomeLido = String(raw.lido_por_nome || '');
  const rawRemetenteNome = String(raw.remetente_nome || '');

  // Detecta se foi marcado como finalizado por qualquer via (coluna, prefixo no tipo, lido_por_nome ou registry local)
  const marcadoFinalizadoFallback =
    rawTipo.startsWith('[FINALIZADO]') ||
    rawNomeLido.startsWith('[FINALIZADO]') ||
    Boolean(dadosReg);

  let finalizado = Boolean(raw.finalizado || marcadoFinalizadoFallback);

  // Detecta se é lembrete do ADM
  const ehAdm = Boolean(
    raw.eh_adm ||
    raw.remetente_tipo === 'adm' ||
    rawTipo.includes('[ADM]') ||
    rawRemetenteNome.toLowerCase().includes('administração') ||
    rawRemetenteNome.toLowerCase().includes('nível 0') ||
    rawRemetenteNome.toLowerCase().includes('admin')
  );

  // Auto-expiração se for lembrete do ADM com data limite ultrapassada
  if (ehAdm && raw.data_limite && !finalizado) {
    const limiteMs = new Date(raw.data_limite).getTime();
    if (!isNaN(limiteMs) && limiteMs <= agora) {
      finalizado = true;
    }
  }

  // Limpa prefixos técnicos para exibição limpa e bonita na interface
  const tipoLimpo = rawTipo
    .replace(/^\[FINALIZADO\]\s*/i, '')
    .replace(/^\[ADM\]\s*/i, '')
    .trim() || (ehAdm ? 'Lembrete do ADM' : 'Aviso Geral');

  const lidoPorNomeLimpo = rawNomeLido
    .replace(/^\[FINALIZADO\]\s*/i, '')
    .trim() || null;

  return {
    id: raw.id || `lemb-${Date.now()}`,
    condominio_id: raw.condominio_id,
    unidade_bloco: raw.unidade_bloco || 'Geral',
    remetente_tipo: raw.remetente_tipo || (ehAdm ? 'adm' : 'morador'),
    remetente_nome: raw.remetente_nome || (ehAdm ? 'Administração (Nível 0)' : ''),
    mensagem: raw.mensagem || '',
    tipo: tipoLimpo,
    lido: Boolean(raw.lido || finalizado),
    lido_em: raw.lido_em || (finalizado ? (dadosReg?.finalizado_em || raw.updated_at || new Date().toISOString()) : null),
    lido_por_nome: lidoPorNomeLimpo,
    lido_por_id: raw.lido_por_id || null,
    finalizado,
    finalizado_em: raw.finalizado_em || dadosReg?.finalizado_em || (finalizado ? (raw.updated_at || raw.data_limite || new Date().toISOString()) : null),
    finalizado_por_nome: raw.finalizado_por_nome || dadosReg?.finalizado_por_nome || (finalizado ? (lidoPorNomeLimpo || (ehAdm && raw.data_limite ? 'Auto-baixa Data Limite (ADM)' : 'Portaria')) : null),
    finalizado_por_id: raw.finalizado_por_id || dadosReg?.finalizado_por_id || null,
    eh_adm: ehAdm,
    data_limite: raw.data_limite || null,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString()
  };
}

/**
 * Fornece dados iniciais demonstrativos quando não há registros no cache nem no banco
 */
function gerarExemplosIniciais(condominioId: string): LembretePortaria[] {
  const agora = new Date();
  return [
    {
      id: 'demo-lembrete-1',
      condominio_id: condominioId,
      unidade_bloco: 'Apto 102 - Bloco B',
      remetente_tipo: 'morador',
      remetente_nome: 'Carlos Eduardo (Morador)',
      mensagem: 'Palavra-chave para entrega da Smart TV: "AZUL2026". Só liberar se o entregador souber a senha.',
      tipo: 'Palavra-chave',
      lido: false,
      finalizado: false,
      eh_adm: false,
      created_at: new Date(agora.getTime() - 25 * 60000).toISOString()
    },
    {
      id: 'demo-lembrete-2',
      condominio_id: condominioId,
      unidade_bloco: 'Apto 504 - Torre A',
      remetente_tipo: 'morador',
      remetente_nome: 'Dra. Mariana Costa (Moradora)',
      mensagem: 'Instrução: Minha mãe virá buscar a chave reserva às 16h30. Ela está com RG com final 448-X.',
      tipo: 'Instrução',
      lido: true,
      lido_em: new Date(agora.getTime() - 10 * 60000).toISOString(),
      lido_por_nome: 'Caetano (Operador)',
      finalizado: false,
      eh_adm: false,
      created_at: new Date(agora.getTime() - 50 * 60000).toISOString()
    },
    {
      id: 'demo-lembrete-adm',
      condominio_id: condominioId,
      unidade_bloco: 'Geral / Portaria',
      remetente_tipo: 'adm',
      remetente_nome: 'Administração Geral (Nível 0)',
      mensagem: 'AVISO IMPORTANTE DO ADM: Conferir o livro de rondas e registrar todas as passagens com foto obrigatória.',
      tipo: 'Lembrete do ADM',
      lido: false,
      finalizado: false,
      eh_adm: true,
      data_limite: new Date(agora.getTime() + 48 * 3600000).toISOString(),
      created_at: new Date(agora.getTime() - 15 * 60000).toISOString()
    }
  ];
}

/**
 * Busca a lista de lembretes do condomínio em ordem decrescente (mais recentes no topo)
 */
export async function buscarLembretes(condominioId: string): Promise<{
  lembretes: LembretePortaria[];
  tabelaExisteNoSupabase: boolean;
  colunasNovasExistemNoSupabase: boolean;
  erro?: string;
}> {
  if (!condominioId) {
    return { lembretes: [], tabelaExisteNoSupabase: true, colunasNovasExistemNoSupabase: true };
  }

  try {
    const { data, error } = await supabase
      .from('lembretes_portaria')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false });

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist')
      ) {
        let emCache = obterLembretesCache(condominioId).map(it => normalizarLembrete(it, condominioId));
        if (emCache.length === 0) {
          emCache = gerarExemplosIniciais(condominioId);
          salvarLembretesCache(condominioId, emCache);
        }
        return {
          lembretes: emCache,
          tabelaExisteNoSupabase: false,
          colunasNovasExistemNoSupabase: false,
          erro: 'A tabela "lembretes_portaria" ainda precisa ser criada no Supabase SQL Editor.'
        };
      }

      const emCache = obterLembretesCache(condominioId).map(it => normalizarLembrete(it, condominioId));
      return {
        lembretes: emCache,
        tabelaExisteNoSupabase: true,
        colunasNovasExistemNoSupabase: false,
        erro: error.message
      };
    }

    const colunasNovas = Boolean(data && data.length > 0 && 'finalizado' in data[0] && 'eh_adm' in data[0]);
    const lista = Array.isArray(data) ? data.map(item => normalizarLembrete(item, condominioId)) : [];

    // Mesclagem segura com cache local para NUNCA reverter um item finalizado
    const cacheLocal = obterLembretesCache(condominioId);
    const mapaAtual = new Map<string, LembretePortaria>();
    lista.forEach(item => mapaAtual.set(item.id, item));

    cacheLocal.forEach(c => {
      if (mapaAtual.has(c.id)) {
        const itemRemoto = mapaAtual.get(c.id)!;
        if (c.finalizado && !itemRemoto.finalizado) {
          mapaAtual.set(c.id, {
            ...itemRemoto,
            finalizado: true,
            finalizado_em: c.finalizado_em || itemRemoto.finalizado_em,
            finalizado_por_nome: c.finalizado_por_nome || itemRemoto.finalizado_por_nome,
            finalizado_por_id: c.finalizado_por_id || itemRemoto.finalizado_por_id
          });
        }
      }
    });

    const listaFinal = Array.from(mapaAtual.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    salvarLembretesCache(condominioId, listaFinal);

    return {
      lembretes: listaFinal,
      tabelaExisteNoSupabase: true,
      colunasNovasExistemNoSupabase: colunasNovas
    };
  } catch (err: any) {
    const emCache = obterLembretesCache(condominioId).map(item => normalizarLembrete(item, condominioId));
    return {
      lembretes: emCache,
      tabelaExisteNoSupabase: false,
      colunasNovasExistemNoSupabase: false,
      erro: err?.message || 'Falha de conexão com o banco de dados.'
    };
  }
}

/**
 * Calcula os contadores detalhados e a cor ativa do alerta
 * - VERMELHO: Se houver lembrete do ADM ativo (não finalizado)
 * - LARANJA: Se houver lembrete aguardando ciência (!lido && !finalizado)
 * - AZUL: Se todos foram marcados como cientes, mas ainda há lembrete em andamento (!finalizado)
 * - NEUTRO: Quando todos forem finalizados (para de piscar)
 */
export function obterStatusContagem(lembretes: LembretePortaria[]): StatusContagemLembretes {
  const agora = Date.now();

  const normalizados = lembretes.map(l => {
    if (l.eh_adm && l.data_limite && !l.finalizado) {
      const dataExp = new Date(l.data_limite).getTime();
      if (!isNaN(dataExp) && dataExp <= agora) {
        return { ...l, finalizado: true, finalizado_em: l.data_limite, finalizado_por_nome: 'Auto-baixa Data Limite (ADM)' };
      }
    }
    return l;
  });

  const ativos = normalizados.filter(l => !l.finalizado);
  const ativosAdm = ativos.filter(l => l.eh_adm);
  const naoLidos = ativos.filter(l => !l.lido);
  const cientesNaoFinalizados = ativos.filter(l => l.lido);

  let corAlerta: 'vermelho' | 'laranja' | 'azul' | 'neutro' = 'neutro';

  if (ativosAdm.length > 0) {
    corAlerta = 'vermelho';
  } else if (naoLidos.length > 0) {
    corAlerta = 'laranja';
  } else if (cientesNaoFinalizados.length > 0) {
    corAlerta = 'azul';
  }

  return {
    total: normalizados.length,
    totalAtivos: ativos.length,
    pendentesNaoLidos: naoLidos.length,
    pendentesCientes: cientesNaoFinalizados.length,
    ativosAdm: ativosAdm.length,
    finalizados: normalizados.filter(l => l.finalizado).length,
    corAlerta
  };
}

/**
 * Função de retrocompatibilidade
 */
export function contarNaoLidos(lembretes: LembretePortaria[]): number {
  return lembretes.filter((l) => !l.finalizado && !l.lido).length;
}

/**
 * Marca um lembrete como ciente
 * Ele para de piscar laranja e passa a piscar em azul até ser finalizado!
 */
export async function marcarComoLido(
  id: string,
  condominioId: string,
  operadorNome?: string,
  operadorId?: string
): Promise<{ sucesso: boolean; erro?: string }> {
  const agora = new Date().toISOString();
  const nome = operadorNome || 'Operador da Portaria';

  // 1. Atualiza imediatamente o cache local para resposta instantânea
  const cache = obterLembretesCache(condominioId);
  const atualizados = cache.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null
      };
    }
    return item;
  });
  salvarLembretesCache(condominioId, atualizados);
  notificarAtualizacaoLembretes(condominioId);

  // 2. Persiste no Supabase
  try {
    const { error } = await supabase
      .from('lembretes_portaria')
      .update({
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null,
        updated_at: agora
      })
      .eq('id', id);

    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      console.warn('Erro ao atualizar status de leitura no Supabase:', error);
    }

    registrarAtividade({
      operador_id: operadorId || '',
      operador_nome: nome,
      acao: 'LEMBRETE_CIENTE',
      descricao: `Lembrete ID ${id} marcado como ciente pelo operador ${nome} (Piscando em azul até finalizar).`,
      detalhes: { lembreteId: id, acao: 'marcar_lido' },
      modulo: 'lembretes_portaria',
      condominio_id: condominioId
    }).catch(() => {});

    return { sucesso: true };
  } catch {
    return { sucesso: true };
  }
}

/**
 * Finaliza / Baixa um lembrete
 * Quando finalizado, para de piscar no alerta e vai para o histórico
 * SE FOR LEMBRETE DO ADM (NÍVEL 0):
 * Apenas o Administrador pode finalizar, ou se a data limite tiver expirado!
 */
export async function finalizarLembrete(
  id: string,
  condominioId: string,
  operadorNome?: string,
  operadorId?: string,
  ehAdmin?: boolean
): Promise<{ sucesso: boolean; erro?: string }> {
  const agora = new Date().toISOString();
  const nome = operadorNome || 'Operador';

  const cache = obterLembretesCache(condominioId);
  const alvo = cache.find(it => it.id === id);

  if (alvo && alvo.eh_adm && !ehAdmin) {
    // Checa se já expirou a data limite
    if (alvo.data_limite) {
      const expMs = new Date(alvo.data_limite).getTime();
      if (isNaN(expMs) || expMs > Date.now()) {
        return {
          sucesso: false,
          erro: 'Este lembrete é exclusivo da Administração (Nível 0). Apenas o Administrador pode baixá-lo manualmente antes da data limite.'
        };
      }
    } else {
      return {
        sucesso: false,
        erro: 'Este lembrete é exclusivo da Administração (Nível 0). Apenas o Administrador pode baixá-lo.'
      };
    }
  }

  // 1. Registra no registro persistente local de finalizados
  registrarFinalizado(condominioId, id, nome, operadorId, agora);

  // 2. Atualiza cache local
  const atualizados = cache.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        lido: true,
        finalizado: true,
        finalizado_em: agora,
        finalizado_por_nome: nome,
        finalizado_por_id: operadorId || null,
        updated_at: agora
      };
    }
    return item;
  });
  salvarLembretesCache(condominioId, atualizados);
  notificarAtualizacaoLembretes(condominioId);

  // 3. Persiste no Supabase com duplo fallback
  try {
    const payloadUpdate: any = {
      lido: true,
      finalizado: true,
      finalizado_em: agora,
      finalizado_por_nome: nome,
      finalizado_por_id: operadorId || null,
      updated_at: agora
    };

    let { error } = await supabase
      .from('lembretes_portaria')
      .update(payloadUpdate)
      .eq('id', id);

    // Se o banco ainda não tiver as colunas novas de finalizado (erro PGRST204 ou 42703):
    // Salva a finalização nos campos canônicos existentes tipo e lido_por_nome
    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || (error as any).code === '42703')) {
      const tipoLimpo = (alvo?.tipo || 'Aviso Geral').replace(/^\[FINALIZADO\]\s*/i, '');
      await supabase
        .from('lembretes_portaria')
        .update({
          lido: true,
          tipo: `[FINALIZADO] ${tipoLimpo}`,
          lido_por_nome: `[FINALIZADO] ${nome}`,
          lido_por_id: operadorId || null,
          lido_em: agora,
          updated_at: agora
        })
        .eq('id', id);
    }

    registrarAtividade({
      operador_id: operadorId || '',
      operador_nome: nome,
      acao: 'LEMBRETE_FINALIZADO',
      descricao: `Lembrete ID ${id} finalizado / baixado com sucesso por ${nome}.`,
      detalhes: { lembreteId: id, acao: 'finalizar' },
      modulo: 'lembretes_portaria',
      condominio_id: condominioId
    }).catch(() => {});

    return { sucesso: true };
  } catch {
    return { sucesso: true };
  }
}

/**
 * Marca TODOS os lembretes do condomínio como cientes de uma vez
 */
export async function marcarTodosComoLidos(
  condominioId: string,
  operadorNome?: string,
  operadorId?: string
): Promise<{ sucesso: boolean; totalAtualizados: number }> {
  const agora = new Date().toISOString();
  const nome = operadorNome || 'Operador da Portaria';

  const cache = obterLembretesCache(condominioId);
  let total = 0;
  const atualizados = cache.map((item) => {
    if (!item.lido) {
      total++;
      return {
        ...item,
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null
      };
    }
    return item;
  });

  salvarLembretesCache(condominioId, atualizados);
  notificarAtualizacaoLembretes(condominioId);

  try {
    await supabase
      .from('lembretes_portaria')
      .update({
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null,
        updated_at: agora
      })
      .eq('condominio_id', condominioId)
      .eq('lido', false);

    registrarAtividade({
      operador_id: operadorId || '',
      operador_nome: nome,
      acao: 'TODOS_LEMBRETES_CIENTES',
      descricao: `${total} lembretes marcados como cientes de uma só vez pelo operador ${nome}.`,
      detalhes: { totalAtualizados: total },
      modulo: 'lembretes_portaria',
      condominio_id: condominioId
    }).catch(() => {});
  } catch {}

  return { sucesso: true, totalAtualizados: total };
}

/**
 * Cria um novo lembrete ou recado
 * Suporta Lembretes do ADM (Nível 0) com data limite
 */
export async function criarLembrete(dados: {
  condominio_id: string;
  unidade_bloco: string;
  remetente_tipo: 'morador' | 'portaria' | 'supervisao' | 'sindico' | 'adm';
  remetente_nome?: string;
  mensagem: string;
  tipo: string;
  lido?: boolean;
  eh_adm?: boolean;
  data_limite?: string | null;
}): Promise<{ sucesso: boolean; lembrete?: LembretePortaria; erro?: string }> {
  const ehAdm = Boolean(dados.eh_adm || dados.remetente_tipo === 'adm');

  const novo: LembretePortaria = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lemb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    condominio_id: dados.condominio_id,
    unidade_bloco: dados.unidade_bloco.trim(),
    remetente_tipo: dados.remetente_tipo,
    remetente_nome: dados.remetente_nome?.trim() || (ehAdm ? 'Administração (Nível 0)' : dados.remetente_tipo === 'portaria' ? 'Portaria' : 'Morador'),
    mensagem: dados.mensagem.trim(),
    tipo: dados.tipo || (ehAdm ? 'Lembrete do ADM' : 'Aviso Geral'),
    lido: Boolean(dados.lido),
    finalizado: false,
    eh_adm: ehAdm,
    data_limite: dados.data_limite ? new Date(dados.data_limite).toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Salva no cache local
  const cache = obterLembretesCache(dados.condominio_id);
  const novaLista = [novo, ...cache];
  salvarLembretesCache(dados.condominio_id, novaLista);
  notificarAtualizacaoLembretes(dados.condominio_id);

  // 2. Persiste no Supabase com fallback seguro
  try {
    const payloadInsert: any = { ...novo };
    let { error } = await supabase.from('lembretes_portaria').insert([payloadInsert]);

    if (error && (error.message?.includes('eh_adm') || error.message?.includes('data_limite') || error.message?.includes('finalizado') || (error as any).code === '42703')) {
      delete payloadInsert.eh_adm;
      delete payloadInsert.data_limite;
      delete payloadInsert.finalizado;
      delete payloadInsert.finalizado_em;
      delete payloadInsert.finalizado_por_nome;
      delete payloadInsert.finalizado_por_id;
      await supabase.from('lembretes_portaria').insert([payloadInsert]);
    }
  } catch (err: any) {
    console.warn('Falha ao conectar com Supabase no insert:', err);
  }

  return { sucesso: true, lembrete: novo };
}

/**
 * Exclui um lembrete do banco e do cache
 */
export async function excluirLembrete(
  id: string,
  condominioId: string
): Promise<{ sucesso: boolean }> {
  const cache = obterLembretesCache(condominioId);
  const filtrados = cache.filter((item) => item.id !== id);
  salvarLembretesCache(condominioId, filtrados);
  removerFinalizado(condominioId, id);
  notificarAtualizacaoLembretes(condominioId);

  try {
    await supabase.from('lembretes_portaria').delete().eq('id', id);
  } catch {}

  return { sucesso: true };
}

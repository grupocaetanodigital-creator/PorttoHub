/**
 * INFPORT 1.0 — Serviço de Configurações de Notificações WhatsApp por Módulo Interno
 * 
 * Permite cadastrar números de telefone ou grupos específicos para receber mensagens
 * automáticas de cada módulo:
 * - Passagens de Posto (Troca de Turno)
 * - Rondas (Alertas, Atrasos e Relatórios)
 * - Manutenções & Ordens de Serviço
 * - Lotes de RE & Encomendas
 * - Chaves Extraviadas / Limite de Tempo Excedido
 * - Ocorrências do Condomínio
 * - Prestadores & Obras (Permanência Estourada e Acessos)
 */

import { supabase } from './supabase';
import { isUUID } from './condominioService';

export interface DestinoModuloWhatsApp {
  telefone_ou_grupo: string;
  nome_destinatario: string;
  ativo: boolean;
  notificar_automatico: boolean;
}

export interface ConfigNotificacoesWhatsApp {
  passagem_posto: DestinoModuloWhatsApp;
  rondas: DestinoModuloWhatsApp;
  manutencoes: DestinoModuloWhatsApp;
  lotes_re: DestinoModuloWhatsApp;
  chaves_extraviadas: DestinoModuloWhatsApp;
  ocorrencias: DestinoModuloWhatsApp;
  prestadores_obras: DestinoModuloWhatsApp;
  geral_sindico: DestinoModuloWhatsApp;
}

export const CONFIG_WHATSAPP_PADRAO: ConfigNotificacoesWhatsApp = {
  passagem_posto: {
    telefone_ou_grupo: '',
    nome_destinatario: 'Grupo Passagem de Posto / Supervisão',
    ativo: true,
    notificar_automatico: true
  },
  rondas: {
    telefone_ou_grupo: '',
    nome_destinatario: 'Grupo Operacional / Rondas & Segurança',
    ativo: true,
    notificar_automatico: true
  },
  manutencoes: {
    telefone_ou_grupo: '',
    nome_destinatario: 'Grupo Manutenção Predial / Zeladoria',
    ativo: true,
    notificar_automatico: true
  },
  lotes_re: {
    telefone_ou_grupo: '',
    nome_destinatario: 'Grupo Encomendas / Logística Portaria',
    ativo: true,
    notificar_automatico: false
  },
  chaves_extraviadas: {
    telefone_ou_grupo: '',
    nome_destinatario: 'Grupo Segurança / Chaves Críticas',
    ativo: true,
    notificar_automatico: true
  },
  ocorrencias: {
    telefone_ou_grupo: '',
    nome_destinatario: 'Grupo Síndico & Conselho / Ocorrências',
    ativo: true,
    notificar_automatico: true
  },
  prestadores_obras: {
    telefone_ou_grupo: '',
    nome_destinatario: 'Grupo Fiscalização de Obras & Prestadores',
    ativo: true,
    notificar_automatico: true
  },
  geral_sindico: {
    telefone_ou_grupo: '',
    nome_destinatario: 'WhatsApp Direto do Síndico / Gestão',
    ativo: true,
    notificar_automatico: false
  }
};

const CHAVE_STORAGE = 'infport_whatsapp_modulos_config';

/**
 * Carrega as configurações de WhatsApp do condomínio
 */
export async function carregarConfigWhatsApp(condominioId?: string): Promise<ConfigNotificacoesWhatsApp> {
  const condId = condominioId || 'padrao';
  
  // 1. Tenta carregar do cache local
  let configLocal: ConfigNotificacoesWhatsApp = { ...CONFIG_WHATSAPP_PADRAO };
  try {
    const raw = localStorage.getItem(`${CHAVE_STORAGE}_${condId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      configLocal = { ...CONFIG_WHATSAPP_PADRAO, ...parsed };
    }
  } catch (e) {
    console.warn('Erro ao ler cache local de WhatsApp:', e);
  }

  // 2. Se houver condominioId, tenta buscar do Supabase
  if (condominioId && condominioId !== 'padrao' && condominioId !== 'todos' && isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('whatsapp_modulos, feature_flags')
        .eq('condominio_id', condominioId)
        .maybeSingle();

      if (!error && data) {
        if (data.whatsapp_modulos && typeof data.whatsapp_modulos === 'object') {
          const configSupabase = { ...CONFIG_WHATSAPP_PADRAO, ...data.whatsapp_modulos };
          localStorage.setItem(`${CHAVE_STORAGE}_${condId}`, JSON.stringify(configSupabase));
          return configSupabase;
        }

        if (data.feature_flags && typeof data.feature_flags === 'object' && (data.feature_flags as any).whatsapp_modulos) {
          const configSupabase = { ...CONFIG_WHATSAPP_PADRAO, ...(data.feature_flags as any).whatsapp_modulos };
          localStorage.setItem(`${CHAVE_STORAGE}_${condId}`, JSON.stringify(configSupabase));
          return configSupabase;
        }
      }
    } catch (e) {
      console.warn('Aviso: fallback local para config WhatsApp:', e);
    }
  }

  return configLocal;
}

/**
 * Salva as configurações de WhatsApp por módulo
 */
export async function salvarConfigWhatsApp(
  condominioId: string, 
  novaConfig: ConfigNotificacoesWhatsApp
): Promise<boolean> {
  const condId = condominioId || 'padrao';

  // 1. Salva imediatamente no localStorage para garantia de funcionamento
  try {
    localStorage.setItem(`${CHAVE_STORAGE}_${condId}`, JSON.stringify(novaConfig));
  } catch (e) {
    console.warn('Erro ao salvar no storage:', e);
  }

  // 2. Tenta salvar no Supabase
  if (condominioId && condominioId !== 'padrao' && condominioId !== 'todos' && isUUID(condominioId)) {
    try {
      // Tenta salvar no campo dedicado whatsapp_modulos
      const { error: err1 } = await supabase
        .from('configuracoes')
        .upsert([{
          condominio_id: condominioId,
          whatsapp_modulos: novaConfig
        }], { onConflict: 'condominio_id' });

      if (!err1) return true;

      // Fallback: salva dentro de feature_flags (JSONB)
      const { data: configAtual } = await supabase
        .from('configuracoes')
        .select('feature_flags')
        .eq('condominio_id', condominioId)
        .maybeSingle();

      const flags = (configAtual?.feature_flags && typeof configAtual.feature_flags === 'object') 
        ? configAtual.feature_flags 
        : {};

      await supabase
        .from('configuracoes')
        .upsert([{
          condominio_id: condominioId,
          feature_flags: {
            ...flags,
            whatsapp_modulos: novaConfig
          }
        }], { onConflict: 'condominio_id' });

      return true;
    } catch (e) {
      console.warn('Erro ao persistir no Supabase (mantido localmente):', e);
      return true; // Retorna true pois salvou localmente
    }
  }

  return true;
}

/**
 * Normaliza e formata número de telefone para WhatsApp com DDI do Brasil (55)
 */
export function normalizarTelefoneWhatsApp(telefoneOuGrupo: string): string {
  if (!telefoneOuGrupo) return '';
  if (telefoneOuGrupo.includes('chat.whatsapp.com')) return telefoneOuGrupo;

  let limpo = telefoneOuGrupo.replace(/\D/g, '');
  if (!limpo) return '';

  // Remove zeros à esquerda (ex: 011999999999 -> 11999999999)
  if (limpo.startsWith('0')) {
    limpo = limpo.replace(/^0+/, '');
  }

  // Se já tiver 12 ou 13 dígitos começando com 55 (ex: 5511999999999)
  if (limpo.startsWith('55') && (limpo.length === 12 || limpo.length === 13)) {
    return limpo;
  }

  // Se tiver 10 ou 11 dígitos (DDD + número brasileiro, ex: 11999999999)
  if (limpo.length === 10 || limpo.length === 11) {
    return `55${limpo}`;
  }

  return limpo;
}

/**
 * Recupera o nome do operador ativo do sistema através de parâmetros ou da sessão salva
 */
export function obterOperadorAtivoNome(usuarioOuNome?: any): string {
  if (typeof usuarioOuNome === 'string' && usuarioOuNome.trim()) {
    return usuarioOuNome.trim();
  }
  if (usuarioOuNome && typeof usuarioOuNome === 'object') {
    if (usuarioOuNome.nome && String(usuarioOuNome.nome).trim()) return String(usuarioOuNome.nome).trim();
    if (usuarioOuNome.operador_nome && String(usuarioOuNome.operador_nome).trim()) return String(usuarioOuNome.operador_nome).trim();
    if (usuarioOuNome.login && String(usuarioOuNome.login).trim()) return String(usuarioOuNome.login).trim();
  }

  // Tenta window.__operadorAtivoNome ou window.__operadorAtivo
  if (typeof window !== 'undefined') {
    const w = window as any;
    if (w.__operadorAtivoNome && String(w.__operadorAtivoNome).trim()) return String(w.__operadorAtivoNome).trim();
    if (w.__operadorAtivo?.nome && String(w.__operadorAtivo.nome).trim()) return String(w.__operadorAtivo.nome).trim();
    if (w.__operadorAtivo?.operador_nome && String(w.__operadorAtivo.operador_nome).trim()) return String(w.__operadorAtivo.operador_nome).trim();
    if (w.__operadorAtivo?.login && String(w.__operadorAtivo.login).trim()) return String(w.__operadorAtivo.login).trim();

    try {
      const opGlobal = window.localStorage.getItem('infport_ultimo_operador_nome');
      if (opGlobal && opGlobal.trim()) return opGlobal.trim();
    } catch {}

    try {
      const sessaoRaw = window.localStorage.getItem('infport_sessao_ativa_v1');
      if (sessaoRaw) {
        const parsed = JSON.parse(sessaoRaw);
        if (parsed.nome && String(parsed.nome).trim()) return String(parsed.nome).trim();
        if (parsed.operadorNome && String(parsed.operadorNome).trim()) return String(parsed.operadorNome).trim();
        if (parsed.login && String(parsed.login).trim()) return String(parsed.login).trim();
      }
    } catch {}

    try {
      const sessaoOpRaw = window.localStorage.getItem('infport_sessao_operador');
      if (sessaoOpRaw) {
        const parsed = JSON.parse(sessaoOpRaw);
        if (parsed.nome && String(parsed.nome).trim()) return String(parsed.nome).trim();
        if (parsed.operadorNome && String(parsed.operadorNome).trim()) return String(parsed.operadorNome).trim();
        if (parsed.login && String(parsed.login).trim()) return String(parsed.login).trim();
      }
    } catch {}
  }

  return 'Portaria';
}

/**
 * Garante que a mensagem de WhatsApp contenha obrigatoriamente:
 * 1. Nome do Operador
 * 2. Data e Hora
 */
export function anexarAssinaturaOperadorDataHora(
  texto: string,
  operadorOuNome?: any,
  dataHora?: Date | string
): string {
  if (!texto) return '';

  const nomeOp = obterOperadorAtivoNome(operadorOuNome);
  let dataHoraStr = '';
  if (dataHora instanceof Date) {
    dataHoraStr = dataHora.toLocaleString('pt-BR');
  } else if (typeof dataHora === 'string' && dataHora.trim()) {
    dataHoraStr = dataHora.trim();
  } else {
    dataHoraStr = new Date().toLocaleString('pt-BR');
  }

  // Verifica se o NOME REAL do operador já está presente explicitamente no texto
  const temNomeEspecifico = nomeOp && nomeOp !== 'Portaria'
    ? texto.toLowerCase().includes(nomeOp.toLowerCase())
    : false;

  // Se já contém uma linha explícita com "Operador:" ou "Operador Responsável:" com o nome real
  const temLinhaOperadorComNome = /(operador|porteiro|atendente|respons[aá]vel):\s*[a-zA-ZÀ-ÿ0-9_]{2,}/i.test(texto);

  const temDataHora = /(data\/hora|data e hora|devolvido em|retirada em|in[ií]cio|fim:|\d{2}\/\d{2}\/\d{4})/i.test(texto);

  if ((temNomeEspecifico || temLinhaOperadorComNome) && temDataHora) {
    return texto;
  }

  let complemento = '';
  if (!temNomeEspecifico && !temLinhaOperadorComNome) {
    complemento += `\n\n👮 *Operador Responsável:* ${nomeOp}`;
  }
  if (!temDataHora) {
    complemento += `\n📅 *Data e Hora:* ${dataHoraStr}`;
  }

  return `${texto.trim()}${complemento}`;
}

/**
 * Retorna o link para abertura direta no WhatsApp (wa.me)
 * Suporta número de telefone individual (ex: 5511999999999) ou grupo.
 * Automaticamente anexa Nome do Operador, Data e Hora na mensagem caso ainda não estejam presentes.
 */
export function formatarLinkWhatsApp(
  telefoneOuGrupo: string,
  texto: string,
  operadorOuNome?: any,
  dataHora?: Date | string
): string {
  const textoFormatado = anexarAssinaturaOperadorDataHora(texto, operadorOuNome, dataHora);
  const textoCodificado = encodeURIComponent(textoFormatado);

  // Se for link direto de grupo (ex: chat.whatsapp.com/...)
  if (telefoneOuGrupo && telefoneOuGrupo.includes('chat.whatsapp.com')) {
    return telefoneOuGrupo;
  }

  const normalizado = normalizarTelefoneWhatsApp(telefoneOuGrupo);
  if (normalizado) {
    return `https://wa.me/${normalizado}?text=${textoCodificado}`;
  }

  // Se não tiver número, abre o WhatsApp permitindo escolher o contato/grupo
  return `https://wa.me/?text=${textoCodificado}`;
}

/**
 * Dispara a abertura do WhatsApp no navegador de forma compatível
 */
export function dispararLinkWhatsApp(link: string): boolean {
  try {
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    try {
      const win = window.open(link, '_blank', 'noopener,noreferrer');
      return !!win;
    } catch {
      return false;
    }
  }
}


/**
 * Dispara o envio de mensagem para o WhatsApp do módulo configurado
 */
export async function dispararNotificacaoModuloWhatsApp(
  condominioId: string | undefined,
  modulo: keyof ConfigNotificacoesWhatsApp,
  textoMensagem: string,
  forcarAbertura: boolean = false
): Promise<{ link: string; destino: DestinoModuloWhatsApp }> {
  const configs = await carregarConfigWhatsApp(condominioId);
  const destino = configs[modulo] || CONFIG_WHATSAPP_PADRAO[modulo];

  const link = formatarLinkWhatsApp(destino.telefone_ou_grupo, textoMensagem);

  if (forcarAbertura || destino.notificar_automatico) {
    try {
      window.open(link, '_blank');
    } catch {
      // Bloqueio de popup
    }
  }

  return { link, destino };
}

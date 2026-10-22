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
  if (condominioId && condominioId !== 'padrao') {
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
  if (condominioId && condominioId !== 'padrao') {
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
 * Retorna o link para abertura direta no WhatsApp (wa.me)
 * Suporta número de telefone individual (ex: 5511999999999) ou grupo
 */
export function formatarLinkWhatsApp(telefoneOuGrupo: string, texto: string): string {
  const limpo = telefoneOuGrupo.replace(/\D/g, '');
  const textoCodificado = encodeURIComponent(texto);

  // Se for link direto de grupo (ex: chat.whatsapp.com/...)
  if (telefoneOuGrupo.includes('chat.whatsapp.com')) {
    return telefoneOuGrupo;
  }

  if (limpo) {
    // Se não tiver código de país (55), adiciona
    const numeroComDDI = limpo.length <= 11 ? `55${limpo}` : limpo;
    return `https://wa.me/${numeroComDDI}?text=${textoCodificado}`;
  }

  // Se não tiver número, abre o WhatsApp Web permitindo escolher o contato/grupo
  return `https://wa.me/?text=${textoCodificado}`;
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

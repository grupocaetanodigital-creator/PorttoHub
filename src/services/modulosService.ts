import { supabase } from './supabase';
import { isUUID } from './condominioService';
import {
  MODULOS_PADRAO_ROTULOS,
  MODULOS_PADRAO_DESCRICOES,
  salvarCustomizacaoVisual,
  obterCustomizacaoVisual
} from './customizacaoVisualService';

export interface ModuloDefinicao {
  id: string; // Ex: 'encomendas', 'bancada'
  flagKey: string; // Ex: 'mod02_gestao_encomendas'
  moduloNum: string;
  aliases: string[]; // Chaves alternativas
  tituloPadrao: string;
  descricaoPadrao: string;
  categoria: 'operacional' | 'seguranca' | 'gestao' | 'sistema';
}

export const LISTA_DEFINICAO_MODULOS: ModuloDefinicao[] = [
  {
    id: 'bancada',
    flagKey: 'mod11_bancada_conferencia',
    moduloNum: '11',
    aliases: ['mod11_bancada_conferencia', 'bancada', 'bancada_conferencia'],
    tituloPadrao: 'Bancada de Portaria',
    descricaoPadrao: 'Atendimento rápido e triagem de balcão na guarita',
    categoria: 'operacional'
  },
  {
    id: 'encomendas',
    flagKey: 'mod02_gestao_encomendas',
    moduloNum: '02',
    aliases: ['mod02_gestao_encomendas', 'encomendas', 'lotes_re'],
    tituloPadrao: 'Encomendas & Lotes',
    descricaoPadrao: 'Recebimento com leitor, triagem e baixa com foto',
    categoria: 'operacional'
  },
  {
    id: 'chaves',
    flagKey: 'mod05_quadro_chaves',
    moduloNum: '05',
    aliases: ['mod05_quadro_chaves', 'chaves', 'claviculario'],
    tituloPadrao: 'Claviculário / Chaves',
    descricaoPadrao: 'Controle de empréstimo e devolução com assinatura',
    categoria: 'operacional'
  },
  {
    id: 'rondas',
    flagKey: 'mod07_gestao_ronda',
    moduloNum: '07',
    aliases: ['mod07_gestao_ronda', 'rondas', 'gestao_ronda'],
    tituloPadrao: 'Rondas Patrimoniais',
    descricaoPadrao: 'Checkpoints de vigilância com QR Code e NFC',
    categoria: 'seguranca'
  },
  {
    id: 'passagem',
    flagKey: 'mod09_passagem_posto',
    moduloNum: '09',
    aliases: ['mod09_passagem_posto', 'passagem', 'passagem_posto'],
    tituloPadrao: 'Passagem de Posto',
    descricaoPadrao: 'Troca de turno e checklist auditado da guarita',
    categoria: 'seguranca'
  },
  {
    id: 'ocorrencias',
    flagKey: 'mod08_livro_ocorrencias',
    moduloNum: '08',
    aliases: ['mod08_livro_ocorrencias', 'ocorrencias', 'livro_ocorrencias'],
    tituloPadrao: 'Livro de Ocorrências',
    descricaoPadrao: 'Registro formal com fotos e áudios de incidentes',
    categoria: 'gestao'
  },
  {
    id: 'prestadores',
    flagKey: 'mod10_prestadores_servico',
    moduloNum: '10',
    aliases: ['mod10_prestadores_servico', 'prestadores', 'autorizados', 'prestadores_obras'],
    tituloPadrao: 'Autorizados & Obras',
    descricaoPadrao: 'Controle de obras, prestadores de serviço e visitantes',
    categoria: 'seguranca'
  },
  {
    id: 'custodia',
    flagKey: 'mod03_custodia_itens',
    moduloNum: '03',
    aliases: ['mod03_custodia_itens', 'custodia', 'custodia_itens'],
    tituloPadrao: 'Custódia de Itens',
    descricaoPadrao: 'Guarda temporária de envelopes e pertences',
    categoria: 'operacional'
  },
  {
    id: 'materiais',
    flagKey: 'mod04_materiais_posto',
    moduloNum: '04',
    aliases: ['mod04_materiais_posto', 'materiais', 'materiais_posto'],
    tituloPadrao: 'Materiais & Inventário',
    descricaoPadrao: 'Carga do posto, lanternas, rádios HT e coletes',
    categoria: 'seguranca'
  },
  {
    id: 'manutencao',
    flagKey: 'mod06_gestao_manutencao',
    moduloNum: '06',
    aliases: ['mod06_gestao_manutencao', 'manutencao', 'gestao_manutencao', 'manutencoes'],
    tituloPadrao: 'Gestão de Manutenção',
    descricaoPadrao: 'Abertura de chamados prediais e Ordens de Serviço',
    categoria: 'gestao'
  },
  {
    id: 'cadastros',
    flagKey: 'mod01_cadastros_base',
    moduloNum: '01',
    aliases: ['mod01_cadastros_base', 'cadastros', 'cadastros_base'],
    tituloPadrao: 'Cadastros Base',
    descricaoPadrao: 'Moradores, unidades/casas, condomínios e operadores',
    categoria: 'gestao'
  },
  {
    id: 'historico_absoluto',
    flagKey: 'mod12_historico_absoluto',
    moduloNum: '12',
    aliases: ['mod12_historico_absoluto', 'historico', 'historico_absoluto'],
    tituloPadrao: 'Histórico Absoluto',
    descricaoPadrao: 'Auditoria cronológica unificada de todas as movimentações',
    categoria: 'gestao'
  },
  {
    id: 'painel_sindico',
    flagKey: 'mod_portal_sindico',
    moduloNum: '13',
    aliases: ['mod_portal_sindico', 'sindico', 'painel_sindico', 'portal_sindico'],
    tituloPadrao: 'Portal do Síndico',
    descricaoPadrao: 'Dashboard executivo e conformidade para síndicos',
    categoria: 'gestao'
  },
  {
    id: 'guia_operacional',
    flagKey: 'mod_guia_operacional',
    moduloNum: '14',
    aliases: ['mod_guia_operacional', 'guia_operacional', 'manual'],
    tituloPadrao: 'Manual & Guia Operacional',
    descricaoPadrao: 'Instruções e manual oficial de operação do sistema',
    categoria: 'sistema'
  }
];

export const MAPA_MODULO_PADRAO: Record<string, boolean> = {
  mod01_cadastros_base: true,
  mod02_gestao_encomendas: true,
  mod03_custodia_itens: true,
  mod04_materiais_posto: true,
  mod05_quadro_chaves: true,
  mod06_gestao_manutencao: true,
  mod07_gestao_ronda: true,
  mod08_livro_ocorrencias: true,
  mod09_passagem_posto: true,
  mod10_prestadores_servico: true,
  mod11_bancada_conferencia: true,
  mod12_historico_absoluto: true,
  mod_portal_sindico: true,
  mod_guia_operacional: true
};

/**
 * Normaliza qualquer formato de flags (chaves curtas, longas, aliases)
 * para um dicionário consistente contendo TODAS as variações ativas/desativas.
 */
export function consolidarFeatureFlags(flagsInput?: any): Record<string, boolean> {
  const resultado: Record<string, boolean> = { ...MAPA_MODULO_PADRAO };
  
  if (!flagsInput) {
    LISTA_DEFINICAO_MODULOS.forEach(mod => {
      resultado[mod.id] = true;
      resultado[mod.flagKey] = true;
      mod.aliases.forEach(al => {
        resultado[al] = true;
      });
    });
    return resultado;
  }

  let raw = flagsInput;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }

  LISTA_DEFINICAO_MODULOS.forEach(mod => {
    const chaves = [mod.flagKey, mod.id, ...mod.aliases];
    let temFalso = false;
    let temVerdadeiro = false;

    for (const k of chaves) {
      if (raw[k] === false || raw[k] === "false" || raw[k] === 0 || raw[k] === "0") {
        temFalso = true;
        break;
      }
      if (raw[k] === true || raw[k] === "true" || raw[k] === 1 || raw[k] === "1") {
        temVerdadeiro = true;
      }
    }

    const valorFinal = temFalso ? false : (temVerdadeiro ? true : true);

    resultado[mod.flagKey] = valorFinal;
    resultado[mod.id] = valorFinal;
    mod.aliases.forEach(al => {
      resultado[al] = valorFinal;
    });
  });

  return resultado;
}



/**
 * Salva as preferências de módulos de um condomínio sincronizando
 * todos os storages locais, Supabase (feature_flags e colunas) e disparando eventos em tempo real.
 */
export async function salvarModulosCondominio(
  condominioId: string,
  flagsModulos: Record<string, boolean>,
  rotulos?: Record<string, string>,
  descricoes?: Record<string, string>,
  icones?: Record<string, string>
): Promise<{ sucesso: boolean; flags: Record<string, boolean>; erro?: string }> {
  if (!condominioId) {
    return { sucesso: false, flags: {}, erro: 'ID de condomínio inválido.' };
  }

  const flagsConsolidadas = consolidarFeatureFlags(flagsModulos);

  // 1. Salva em todos os storages locais para sincronismo instantâneo
  try {
    localStorage.setItem(`infport_flags_${condominioId}`, JSON.stringify(flagsConsolidadas));
    localStorage.setItem(`porttohub_flags_${condominioId}`, JSON.stringify(flagsConsolidadas));
    localStorage.setItem(`porttohub_modulos_condo_${condominioId}`, JSON.stringify(flagsConsolidadas));

    // Se houver customização de rótulos, descrições ou ícones
    const visualAtual = obterCustomizacaoVisual(condominioId);
    const modulosOcultosAtualizados = new Set<string>(visualAtual.modulosOcultos || []);

    // Sincroniza flags com modulosOcultos: módulos desativados são ocultados, ativados são reexibidos
    LISTA_DEFINICAO_MODULOS.forEach(mod => {
      const estaAtivo = flagsConsolidadas[mod.flagKey] !== false && flagsConsolidadas[mod.id] !== false;
      const aliases = mod.aliases || [];
      if (!estaAtivo) {
        modulosOcultosAtualizados.add(mod.id);
        aliases.forEach(al => modulosOcultosAtualizados.add(al));
      } else {
        modulosOcultosAtualizados.delete(mod.id);
        aliases.forEach(al => modulosOcultosAtualizados.delete(al));
      }
    });

    salvarCustomizacaoVisual({
      rotulosModulos: rotulos || visualAtual.rotulosModulos || MODULOS_PADRAO_ROTULOS,
      descricoesModulos: descricoes || visualAtual.descricoesModulos || MODULOS_PADRAO_DESCRICOES,
      iconesModulos: icones || visualAtual.iconesModulos || {},
      modulosOcultos: Array.from(modulosOcultosAtualizados)
    }, condominioId);
  } catch (e) {
    console.warn('Erro ao gravar cache local de módulos:', e);
  }

  // 2. Dispara eventos em tempo real no navegador
  const eventPayload = {
    condominio_id: condominioId,
    condominioId: condominioId,
    flags: flagsConsolidadas,
    modulos: flagsConsolidadas
  };
  window.dispatchEvent(new CustomEvent('modulos_atualizados', { detail: eventPayload }));
  window.dispatchEvent(new CustomEvent('modulos_condominio_atualizados', { detail: eventPayload }));
  window.dispatchEvent(new CustomEvent('configuracoes_atualizadas', { detail: eventPayload }));

  // 3. Persiste no Supabase
  try {
    const payloadSupabase: any = {
      condominio_id: condominioId,
      feature_flags: {
        ...flagsConsolidadas,
        ...(rotulos ? { rotulos_modulos: rotulos } : {}),
        ...(descricoes ? { descricoes_modulos: descricoes } : {}),
        ...(icones ? { icones_modulos: icones } : {})
      },
      modulos_ativos: flagsConsolidadas,
      mod01_cadastros_base: flagsConsolidadas.mod01_cadastros_base,
      mod02_gestao_encomendas: flagsConsolidadas.mod02_gestao_encomendas,
      mod03_custodia_itens: flagsConsolidadas.mod03_custodia_itens,
      mod04_materiais_posto: flagsConsolidadas.mod04_materiais_posto,
      mod05_quadro_chaves: flagsConsolidadas.mod05_quadro_chaves,
      mod06_gestao_manutencao: flagsConsolidadas.mod06_gestao_manutencao,
      mod07_gestao_ronda: flagsConsolidadas.mod07_gestao_ronda,
      mod08_livro_ocorrencias: flagsConsolidadas.mod08_livro_ocorrencias,
      mod09_passagem_posto: flagsConsolidadas.mod09_passagem_posto,
      mod10_prestadores_servico: flagsConsolidadas.mod10_prestadores_servico,
      mod11_bancada_conferencia: flagsConsolidadas.mod11_bancada_conferencia,
      mod12_historico_absoluto: flagsConsolidadas.mod12_historico_absoluto,
      mod_portal_sindico: flagsConsolidadas.mod_portal_sindico
    };

    if (isUUID(condominioId)) {
      const { error } = await supabase
        .from('configuracoes')
        .upsert([payloadSupabase], { onConflict: 'condominio_id' });

      if (error) {
        // Fallback apenas para o JSONB se alguma coluna faltar
        await supabase
          .from('configuracoes')
          .upsert([
            {
              condominio_id: condominioId,
              feature_flags: payloadSupabase.feature_flags
            }
          ], { onConflict: 'condominio_id' });
      }
    }
  } catch (errSupabase: any) {
    console.warn('Persistido localmente (Supabase indisponível):', errSupabase?.message || errSupabase);
  }

  return { sucesso: true, flags: flagsConsolidadas };
}

/**
 * Carrega a parametrização de módulos de um condomínio
 */
export async function carregarModulosCondominio(condominioId: string): Promise<Record<string, boolean>> {
  if (!condominioId) {
    return consolidarFeatureFlags();
  }

  // 1. Tenta carregar dos caches locais
  const cache1 = localStorage.getItem(`infport_flags_${condominioId}`);
  const cache2 = localStorage.getItem(`porttohub_flags_${condominioId}`);
  const cache3 = localStorage.getItem(`porttohub_modulos_condo_${condominioId}`);

  let estadoCache: any = null;
  for (const c of [cache1, cache2, cache3]) {
    if (c) {
      try {
        const p = JSON.parse(c);
        if (p && typeof p === 'object') {
          estadoCache = p;
          break;
        }
      } catch {}
    }
  }

  // 2. Se for UUID, busca no Supabase
  if (isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', condominioId)
        .maybeSingle();

      if (!error && data) {
        let ff = data.feature_flags;
        if (typeof ff === 'string') {
          try {
            ff = JSON.parse(ff);
          } catch {
            ff = {};
          }
        }
        if (!ff || typeof ff !== 'object') ff = {};

        // Mescla com colunas individuais e feature_flags
        // As feature_flags do banco de dados têm precedência sobre cache local prévio
        const mesclado = {
          ...(estadoCache || {}),
          ...data,
          ...(data.modulos_ativos && typeof data.modulos_ativos === 'object' ? data.modulos_ativos : {}),
          ...ff
        };

        const consolidado = consolidarFeatureFlags(mesclado);
        // Atualiza cache local
        localStorage.setItem(`infport_flags_${condominioId}`, JSON.stringify(consolidado));
        localStorage.setItem(`porttohub_flags_${condominioId}`, JSON.stringify(consolidado));
        return consolidado;
      }
    } catch (e) {
      console.warn('Erro ao buscar módulos no Supabase:', e);
    }
  }

  return consolidarFeatureFlags(estadoCache);
}


/**
 * Verifica se um determinado módulo está ativo.
 * Retorna false se QUALQUER variação da sua chave estiver marcada como false.
 */
export function isModuloAtivo(idOuFlag: string, flags?: Record<string, any>): boolean {
  if (!flags) return true;
  const modDef = LISTA_DEFINICAO_MODULOS.find(
    m => m.id === idOuFlag || m.flagKey === idOuFlag || m.aliases.includes(idOuFlag)
  );
  if (!modDef) {
    return flags[idOuFlag] !== false && flags[idOuFlag] !== "false" && flags[idOuFlag] !== 0;
  }
  const chaves = [modDef.id, modDef.flagKey, ...modDef.aliases];
  for (const k of chaves) {
    if (flags[k] === false || flags[k] === "false" || flags[k] === 0 || flags[k] === "0") {
      return false;
    }
  }
  // Se explicitamente marcado como true em alguma chave ou se for o padrão (não false)
  return true;
}

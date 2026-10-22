import { supabase } from './supabase';

export interface SetorRonda {
  id: string;
  codigo?: string;
  titulo: string;
  descricao?: string;
  itens: string[];
  ativo?: boolean;
}

export const SETORES_RONDA_PADRAO: SetorRonda[] = [
  {
    id: 'SETOR_A',
    codigo: 'SET-A',
    titulo: 'SETOR A: GUARITA & ENTRADA PRINCIPAL',
    itens: [
      '1º Portões de pedestres e de veículos (funcionamento e fechos)',
      '2º Sistema de CFTV (câmeras e monitoramento)',
      '3º Interfonia da Guarita',
      '4º Salão de Festas ao lado da guarita (iluminação, limpeza, portas e fechos)'
    ],
    ativo: true
  },
  {
    id: 'SETOR_B',
    codigo: 'SET-B',
    titulo: 'SETOR B: TÉRREO TORRE A (ÁREAS DE LAZER INTERNAS)',
    itens: [
      '5º Salão Gourmet (iluminação, limpeza, organização e conservação)',
      '6º Academia (iluminação, equipamentos, limpeza e organização)',
      '7º Salão de Jogos (mesas, iluminação e conservação)',
      '8º Churrasqueira 1 (pia, grelhas e limpeza geral)'
    ],
    ativo: true
  },
  {
    id: 'SETOR_C',
    codigo: 'SET-C',
    titulo: 'SETOR C: HALL & ELEVADORES — TORRE A',
    itens: [
      '9º Torre A - Corredor 1-6 (1 Elevador Social + 1 Elevador Serviço)',
      '10º Torre A - Corredor 7-10 (1 Elevador Social + 1 Elevador Serviço)',
      '11º Quadro de Avisos exclusivo da Torre A'
    ],
    ativo: true
  },
  {
    id: 'SETOR_D',
    codigo: 'SET-D',
    titulo: 'SETOR D: HALL & ELEVADORES — TORRE B',
    itens: [
      '12º Torre B - Corredor 1-6 (1 Elevador Social + 1 Elevador Serviço)',
      '13º Torre B - Corredor 7-10 (1 Elevador Social + 1 Elevador Serviço)',
      '14º Mercadinho da Torre B (acesso, iluminação e limpeza)'
    ],
    ativo: true
  },
  {
    id: 'SETOR_E',
    codigo: 'SET-E',
    titulo: 'SETOR E: PASSARELA INTER-TORRES & ELEVADOR DA GARAGEM',
    itens: [
      '15º Passarela inter-torres de acesso aos elevadores (-1 ao -3)',
      '16º Elevador Exclusivo do Estacionamento (botoeira, iluminação e portas)',
      '17º Quadro de Avisos no hall do elevador',
      '18º Escadaria 1 da Garagem (Térreo ao -3)'
    ],
    ativo: true
  },
  {
    id: 'SETOR_F',
    codigo: 'SET-F',
    titulo: 'SETOR F: ESTACIONAMENTOS (-1, -2, -3) & ESCADARIA DE EMERGÊNCIA',
    itens: [
      '19º Estacionamento -1 (iluminação, sinalização, tubulações e extintores)',
      '20º Estacionamento -2 (iluminação, ausência de vazamentos e portas corta-fogo)',
      '21º Estacionamento -3 (poço de esgotamento/bombas, umidade e rotas de fuga)',
      '22º Escadaria 2 da Garagem (-1 ao -3)'
    ],
    ativo: true
  },
  {
    id: 'SETOR_G',
    codigo: 'SET-G',
    titulo: 'SETOR G: ÁREAS DE LAZER EXTERNAS',
    itens: [
      '23º Playground (conservação dos brinquedos)',
      '24º Piscina (portão de acesso e deck)',
      '25º Quadra Poliesportiva (iluminação, redes e estado geral)',
      '26º Churrasqueira 2 (pia, grelhas e limpeza geral)'
    ],
    ativo: true
  },
  {
    id: 'SETOR_H',
    codigo: 'SET-H',
    titulo: 'SETOR H: INCÊNDIO & HALLS — TORRE A',
    itens: [
      'Torre A - Corredores e portas divisórias',
      'Torre A - Porta Corta-Fogo e Pressurização',
      'Torre A - Caixa de Hidrante e Mangueira',
      'Torre A - Extintores (pressão e validade)',
      'Torre A - Sensores de fumaça e Iluminação de emergência'
    ],
    ativo: true
  },
  {
    id: 'SETOR_I',
    codigo: 'SET-I',
    titulo: 'SETOR I: INCÊNDIO & HALLS — TORRE B',
    itens: [
      'Torre B - Corredores e portas divisórias',
      'Torre B - Porta Corta-Fogo e Pressurização',
      'Torre B - Caixa de Hidrante e Mangueira',
      'Torre B - Extintores (pressão e validade)',
      'Torre B - Sensores de fumaça e Iluminação de emergência'
    ],
    ativo: true
  }
];

export async function carregarSetoresRonda(condominioId?: string): Promise<SetorRonda[]> {
  const cId = condominioId || 'geral';
  const key = `infport_setores_ronda_${cId}`;

  // 1. Tentar ler do cache local para resposta imediata
  const cached = localStorage.getItem(key);
  let parsedCached: SetorRonda[] | null = null;
  if (cached) {
    try {
      const p = JSON.parse(cached);
      if (Array.isArray(p) && p.length > 0) {
        parsedCached = p;
      }
    } catch {
      // ignore
    }
  }

  if (!condominioId) {
    return parsedCached || SETORES_RONDA_PADRAO;
  }

  try {
    // 2. Tentar ler da tabela dedicada rondas_setores se existir
    const { data: dadosTabela, error: errTabela } = await supabase
      .from('rondas_setores')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('id', { ascending: true });

    if (!errTabela && dadosTabela && dadosTabela.length > 0) {
      const normalizados: SetorRonda[] = dadosTabela.map(s => ({
        id: s.id,
        codigo: s.codigo || s.id,
        titulo: s.titulo,
        descricao: s.descricao || '',
        itens: Array.isArray(s.itens) ? s.itens : (typeof s.itens === 'string' ? JSON.parse(s.itens) : []),
        ativo: s.ativo !== false
      }));
      localStorage.setItem(key, JSON.stringify(normalizados));
      return normalizados;
    }

    // 3. Fallback: Tentar ler de configuracoes (coluna JSONB setores_ronda)
    const { data: configData } = await supabase
      .from('configuracoes')
      .select('setores_ronda')
      .eq('condominio_id', condominioId)
      .maybeSingle();

    if (configData?.setores_ronda && Array.isArray(configData.setores_ronda) && configData.setores_ronda.length > 0) {
      localStorage.setItem(key, JSON.stringify(configData.setores_ronda));
      return configData.setores_ronda;
    }

    // Se temos cache local válido, usa ele
    if (parsedCached && parsedCached.length > 0) {
      return parsedCached;
    }

    // 4. Inicializa com o padrão do condomínio
    localStorage.setItem(key, JSON.stringify(SETORES_RONDA_PADRAO));
    return SETORES_RONDA_PADRAO;
  } catch (err) {
    console.error('Erro ao carregar setores de ronda do Supabase:', err);
    return parsedCached || SETORES_RONDA_PADRAO;
  }
}

export async function salvarSetoresRonda(condominioId: string, setores: SetorRonda[]): Promise<boolean> {
  if (!condominioId) return false;
  const key = `infport_setores_ronda_${condominioId}`;

  // Salva no cache local de imediato
  localStorage.setItem(key, JSON.stringify(setores));

  // Dispara evento em tempo real para sincronizar todas as telas e abas abertas
  window.dispatchEvent(new CustomEvent('setores_ronda_atualizados', {
    detail: { condominio_id: condominioId, setores }
  }));

  try {
    // 1. Salvar na tabela configuracoes (JSONB)
    await supabase
      .from('configuracoes')
      .upsert([
        { condominio_id: condominioId, setores_ronda: setores }
      ], { onConflict: 'condominio_id' });

    // 2. Tentar salvar na tabela dedicada rondas_setores caso exista
    try {
      const payloadTabela = setores.map(s => ({
        id: s.id,
        condominio_id: condominioId,
        codigo: s.codigo || s.id,
        titulo: s.titulo,
        descricao: s.descricao || '',
        itens: s.itens,
        ativo: s.ativo !== false
      }));

      await supabase
        .from('rondas_setores')
        .upsert(payloadTabela, { onConflict: 'id,condominio_id' });
    } catch {
      // ignore se tabela dedicada ainda não foi criada
    }

    return true;
  } catch (err) {
    console.warn('Aviso ao sincronizar setores no Supabase (usando cópia local):', err);
    return true;
  }
}

export function gerarIdSetor(titulo: string, setoresExistentes: SetorRonda[]): string {
  // Tenta extrair letra ou nome limpo
  const limpo = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  let baseId = limpo.slice(0, 20);
  if (!baseId.startsWith('SETOR_')) {
    baseId = `SETOR_${baseId}`;
  }

  let finalId = baseId;
  let counter = 1;
  while (setoresExistentes.some(s => s.id === finalId)) {
    finalId = `${baseId}_${counter}`;
    counter++;
  }

  return finalId;
}

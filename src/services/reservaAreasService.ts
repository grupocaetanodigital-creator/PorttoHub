import { supabase } from './supabase';
import { isUUID } from './condominioService';
import { registrarAtividade } from './auditoriaService';

export interface ConvidadoEvento {
  id: string;
  nome: string;
  documento?: string;
  parentesco_ou_tipo?: string;
  confirmado_portaria?: boolean;
  horario_entrada?: string;
}

export interface VistoriaChecklist {
  realizada: boolean;
  data_hora?: string;
  operador_nome?: string;
  chaves_entregues_ou_devolvidas?: boolean;
  estado_conservacao?: 'otimo' | 'bom' | 'regular' | 'com_avarias';
  limpeza_conforme?: boolean;
  houve_avarias?: boolean;
  observacoes?: string;
  fotos?: string[];
}

export interface AreaComum {
  id: string;
  condominio_id: string;
  nome: string;
  descricao: string;
  capacidade_maxima: number;
  taxa_reserva: number;
  taxa_limpeza: number;
  valor_caucao: number;
  antecedencia_minima_dias: number;
  antecedencia_maxima_dias: number;
  horario_inicio: string;
  horario_fim: string;
  duracao_slot_minutos?: number;
  tipo_area?: string;
  intervalo_limpeza_horas: number;
  turnos_disponiveis: ('manha' | 'tarde' | 'noite' | 'dia_todo')[];
  dias_funcionamento: number[]; // 0=Dom, 1=Seg, ..., 6=Sab
  regras_termo: string;
  exige_aprovacao_sindico: boolean;
  foto_url?: string;
  ativa: boolean;
}

export interface ReservaArea {
  id: string;
  condominio_id: string;
  area_id: string;
  area_nome: string;
  morador_id?: string;
  morador_nome: string;
  morador_telefone: string;
  unidade_bloco: string;
  data_reserva: string; // YYYY-MM-DD
  turno: 'manha' | 'tarde' | 'noite' | 'dia_todo' | 'personalizado';
  horario_inicio: string;
  horario_fim: string;
  tipo_evento: string;
  qtd_convidados_estimada: number;
  status: 'pendente' | 'aprovada' | 'recusada' | 'cancelada' | 'concluida';
  valor_total: number;
  pago: boolean;
  termo_aceito: boolean;
  data_aceite_termo?: string;
  observacoes_solicitante?: string;
  motivo_recusa?: string;
  aprovado_por_nome?: string;
  aprovado_em?: string;
  vistoria_entrada?: VistoriaChecklist;
  vistoria_saida?: VistoriaChecklist;
  lista_convidados?: ConvidadoEvento[];
  criado_em: string;
}

const CHAVE_STORAGE_AREAS = 'porttohub_areas_comuns_';
const CHAVE_STORAGE_RESERVAS = 'porttohub_reservas_';

export const AREAS_PADRAO_SEED: Omit<AreaComum, 'id' | 'condominio_id'>[] = [];

// Chave para identificar que as áreas padrão pré-cadastradas antigas foram devidamente limpas
const CHAVE_MIGRACAO_LIMPEZA = 'porttohub_areas_limpas_v3_';

export async function carregarAreasComuns(condominioId: string): Promise<AreaComum[]> {
  if (!condominioId) return [];

  // Se o usuário ainda tinha áreas padrão/mock salvas anteriormente no localStorage,
  // nós realizamos uma limpeza para atender ao pedido de excluir todas as áreas pré-cadastradas.
  const migradoKey = `${CHAVE_MIGRACAO_LIMPEZA}${condominioId}`;
  const jaLimpouAntigas = localStorage.getItem(migradoKey);

  if (!jaLimpouAntigas) {
    const cached = localStorage.getItem(`${CHAVE_STORAGE_AREAS}${condominioId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Detecta se contém as áreas mock iniciais
          const eramMocks = parsed.some((a: any) => 
            (typeof a.id === 'string' && a.id.startsWith('area-')) || 
            a.nome === 'Quadra de Tênis Rápida' || 
            a.nome === 'Academia & Fitness Center' || 
            a.nome === 'Salão de Festas Nobre' ||
            a.nome === 'Salão de Jogos & Sinuca' ||
            a.nome === 'Churrasqueira Gourmet 01 (Piscina)' ||
            a.nome === 'Espaço Gourmet & Lounge'
          );
          if (eramMocks) {
            localStorage.removeItem(`${CHAVE_STORAGE_AREAS}${condominioId}`);
          }
        }
      } catch {}
    }
    localStorage.setItem(migradoKey, 'true');
  }

  // 1. Tenta carregar do Supabase se houver tabela
  if (isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('areas_comuns')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('nome', { ascending: true });

      if (!error && data) {
        localStorage.setItem(`${CHAVE_STORAGE_AREAS}${condominioId}`, JSON.stringify(data));
        return data as AreaComum[];
      }
    } catch {
      // Ignora e faz fallback
    }
  }

  // 2. Cache local
  const cached = localStorage.getItem(`${CHAVE_STORAGE_AREAS}${condominioId}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // 3. Nenhuma área pré-cadastrada: começa 100% vazia
  return [];
}

export async function excluirTodasAreasComuns(condominioId: string): Promise<boolean> {
  if (!condominioId) return false;
  localStorage.removeItem(`${CHAVE_STORAGE_AREAS}${condominioId}`);
  localStorage.setItem(`${CHAVE_MIGRACAO_LIMPEZA}${condominioId}`, 'true');

  if (isUUID(condominioId)) {
    try {
      await supabase.from('areas_comuns').delete().eq('condominio_id', condominioId);
    } catch (e) {
      console.warn('Erro ao deletar áreas no Supabase:', e);
    }
  }
  return true;
}

export async function salvarAreaComum(condominioId: string, area: Partial<AreaComum>): Promise<AreaComum> {
  const areas = await carregarAreasComuns(condominioId);
  const id = area.id || `area-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  const areaCompleta: AreaComum = {
    id,
    condominio_id: condominioId,
    nome: area.nome || 'Novo Espaço Comum',
    descricao: area.descricao || '',
    capacidade_maxima: Number(area.capacidade_maxima) || 30,
    taxa_reserva: Number(area.taxa_reserva) || 0,
    taxa_limpeza: Number(area.taxa_limpeza) || 0,
    valor_caucao: Number(area.valor_caucao) || 0,
    antecedencia_minima_dias: Number(area.antecedencia_minima_dias) || 1,
    antecedencia_maxima_dias: Number(area.antecedencia_maxima_dias) || 60,
    horario_inicio: area.horario_inicio || '09:00',
    horario_fim: area.horario_fim || '22:00',
    intervalo_limpeza_horas: Number(area.intervalo_limpeza_horas) || 2,
    turnos_disponiveis: area.turnos_disponiveis || ['manha', 'tarde', 'noite', 'dia_todo'],
    dias_funcionamento: area.dias_funcionamento || [0, 1, 2, 3, 4, 5, 6],
    regras_termo: area.regras_termo || 'Cuidar do espaço e respeitar os vizinhos.',
    exige_aprovacao_sindico: Boolean(area.exige_aprovacao_sindico),
    foto_url: area.foto_url || '',
    ativa: area.ativa !== false
  };

  const index = areas.findIndex(a => a.id === id);
  if (index >= 0) {
    areas[index] = areaCompleta;
  } else {
    areas.push(areaCompleta);
  }

  localStorage.setItem(`${CHAVE_STORAGE_AREAS}${condominioId}`, JSON.stringify(areas));

  // Tenta persistir no Supabase se disponível
  if (isUUID(condominioId)) {
    try {
      await supabase.from('areas_comuns').upsert([areaCompleta]);
    } catch {}
  }

  return areaCompleta;
}

export async function excluirAreaComum(condominioId: string, areaId: string): Promise<boolean> {
  const areas = await carregarAreasComuns(condominioId);
  const filtradas = areas.filter(a => a.id !== areaId);
  localStorage.setItem(`${CHAVE_STORAGE_AREAS}${condominioId}`, JSON.stringify(filtradas));

  if (isUUID(condominioId)) {
    try {
      await supabase.from('areas_comuns').delete().eq('id', areaId);
    } catch {}
  }

  return true;
}

export async function alternarStatusAreaComum(condominioId: string, areaId: string): Promise<AreaComum | null> {
  const areas = await carregarAreasComuns(condominioId);
  const index = areas.findIndex(a => a.id === areaId);
  if (index === -1) return null;

  areas[index].ativa = !areas[index].ativa;
  localStorage.setItem(`${CHAVE_STORAGE_AREAS}${condominioId}`, JSON.stringify(areas));

  if (isUUID(condominioId)) {
    try {
      await supabase.from('areas_comuns').update({ ativa: areas[index].ativa }).eq('id', areaId);
    } catch {}
  }

  return areas[index];
}

export async function carregarReservas(condominioId: string): Promise<ReservaArea[]> {
  if (!condominioId) return [];

  // 1. Supabase
  if (isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('reservas_areas_comuns')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('data_reserva', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${CHAVE_STORAGE_RESERVAS}${condominioId}`, JSON.stringify(data));
        return data as ReservaArea[];
      }
    } catch {}
  }

  // 2. Cache local
  const cached = localStorage.getItem(`${CHAVE_STORAGE_RESERVAS}${condominioId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  // Se não existir, gera reservas de exemplo realistas
  const reservasIniciais: ReservaArea[] = [
    {
      id: `res-${Date.now()}-1`,
      condominio_id: condominioId,
      area_id: `area-${condominioId.slice(0, 8)}-1`,
      area_nome: 'Salão de Festas Nobre',
      morador_nome: 'Carlos Eduardo Mendes',
      morador_telefone: '(11) 98844-2211',
      unidade_bloco: 'Torre A - Apto 502',
      data_reserva: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      turno: 'noite',
      horario_inicio: '18:00',
      horario_fim: '23:00',
      tipo_evento: 'Aniversário Infantil',
      qtd_convidados_estimada: 45,
      status: 'aprovada',
      valor_total: 230.00,
      pago: true,
      termo_aceito: true,
      data_aceite_termo: new Date().toISOString(),
      aprovado_por_nome: 'Síndico(a) Geral',
      aprovado_em: new Date().toISOString(),
      lista_convidados: [
        { id: '1', nome: 'Mariana Lima Silveira', documento: '45.123.889-X', parentesco_ou_tipo: 'Convidada' },
        { id: '2', nome: 'Rodrigo Santoro Ramos', documento: '38.990.231-1', parentesco_ou_tipo: 'Convidado' },
        { id: '3', nome: 'Fernanda Paes', documento: '50.112.443-8', parentesco_ou_tipo: 'Familiar' }
      ],
      criado_em: new Date().toISOString()
    },
    {
      id: `res-${Date.now()}-2`,
      condominio_id: condominioId,
      area_id: `area-${condominioId.slice(0, 8)}-2`,
      area_nome: 'Churrasqueira Gourmet 01 (Piscina)',
      morador_nome: 'Ana Beatriz Souza',
      morador_telefone: '(11) 97123-5566',
      unidade_bloco: 'Torre B - Apto 1104',
      data_reserva: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      turno: 'tarde',
      horario_inicio: '12:00',
      horario_fim: '17:00',
      tipo_evento: 'Churrasco Familiar',
      qtd_convidados_estimada: 18,
      status: 'pendente',
      valor_total: 110.00,
      pago: false,
      termo_aceito: true,
      data_aceite_termo: new Date().toISOString(),
      criado_em: new Date().toISOString()
    }
  ];

  localStorage.setItem(`${CHAVE_STORAGE_RESERVAS}${condominioId}`, JSON.stringify(reservasIniciais));
  return reservasIniciais;
}

export async function verificarConflitoReserva(
  condominioId: string,
  areaId: string,
  dataReserva: string,
  turno: string,
  horarioInicio: string,
  horarioFim: string,
  ignorarReservaId?: string
): Promise<{ temConflito: boolean; reservaConflitante?: ReservaArea; motivo?: string }> {
  const reservas = await carregarReservas(condominioId);
  const ativas = reservas.filter(r => 
    r.area_id === areaId &&
    r.data_reserva === dataReserva &&
    r.status !== 'recusada' &&
    r.status !== 'cancelada' &&
    r.id !== ignorarReservaId
  );

  for (const r of ativas) {
    if (r.turno === 'dia_todo' || turno === 'dia_todo') {
      return {
        temConflito: true,
        reservaConflitante: r,
        motivo: `Já existe uma reserva (${r.unidade_bloco} - ${r.morador_nome}) para o dia todo ou conflitando com o turno.`
      };
    }
    if (r.turno === turno) {
      return {
        temConflito: true,
        reservaConflitante: r,
        motivo: `O turno "${turno}" já está reservado por ${r.morador_nome} (${r.unidade_bloco}).`
      };
    }
    // Verificação de sobreposição de horários
    if (horarioInicio && horarioFim && r.horario_inicio && r.horario_fim) {
      if (horarioInicio < r.horario_fim && horarioFim > r.horario_inicio) {
        return {
          temConflito: true,
          reservaConflitante: r,
          motivo: `Horário solicitado (${horarioInicio} - ${horarioFim}) sobrepõe a reserva existente (${r.horario_inicio} - ${r.horario_fim}).`
        };
      }
    }
  }

  return { temConflito: false };
}

export async function criarOuAtualizarReserva(
  condominioId: string,
  dados: Partial<ReservaArea>,
  operadorLogado?: any
): Promise<{ sucesso: boolean; reserva?: ReservaArea; erro?: string }> {
  if (!condominioId || !dados.area_id || !dados.data_reserva) {
    return { sucesso: false, erro: 'Preencha os campos obrigatórios da reserva (Área e Data).' };
  }

  // Validação de conflito
  const conflito = await verificarConflitoReserva(
    condominioId,
    dados.area_id,
    dados.data_reserva,
    dados.turno || 'dia_todo',
    dados.horario_inicio || '',
    dados.horario_fim || '',
    dados.id
  );

  if (conflito.temConflito) {
    return { sucesso: false, erro: conflito.motivo || 'Horário já reservado para este espaço.' };
  }

  const reservas = await carregarReservas(condominioId);
  const areas = await carregarAreasComuns(condominioId);
  const area = areas.find(a => a.id === dados.area_id);

  const id = dados.id || `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const statusInicial = dados.status || (area?.exige_aprovacao_sindico ? 'pendente' : 'aprovada');

  const novaReserva: ReservaArea = {
    id,
    condominio_id: condominioId,
    area_id: dados.area_id,
    area_nome: area?.nome || dados.area_nome || 'Área Comum',
    morador_id: dados.morador_id || '',
    morador_nome: dados.morador_nome || 'Morador Solicitante',
    morador_telefone: dados.morador_telefone || '',
    unidade_bloco: dados.unidade_bloco || 'Unidade não informada',
    data_reserva: dados.data_reserva,
    turno: dados.turno || 'dia_todo',
    horario_inicio: dados.horario_inicio || area?.horario_inicio || '10:00',
    horario_fim: dados.horario_fim || area?.horario_fim || '22:00',
    tipo_evento: dados.tipo_evento || 'Confraternização',
    qtd_convidados_estimada: Number(dados.qtd_convidados_estimada) || 10,
    status: statusInicial,
    valor_total: (area?.taxa_reserva || 0) + (area?.taxa_limpeza || 0),
    pago: Boolean(dados.pago),
    termo_aceito: Boolean(dados.termo_aceito),
    data_aceite_termo: dados.termo_aceito ? (dados.data_aceite_termo || new Date().toISOString()) : undefined,
    observacoes_solicitante: dados.observacoes_solicitante || '',
    motivo_recusa: dados.motivo_recusa,
    aprovado_por_nome: statusInicial === 'aprovada' ? (operadorLogado?.nome || 'Sistema Automático') : undefined,
    aprovado_em: statusInicial === 'aprovada' ? new Date().toISOString() : undefined,
    vistoria_entrada: dados.vistoria_entrada || { realizada: false },
    vistoria_saida: dados.vistoria_saida || { realizada: false },
    lista_convidados: dados.lista_convidados || [],
    criado_em: dados.criado_em || new Date().toISOString()
  };

  const idx = reservas.findIndex(r => r.id === id);
  if (idx >= 0) {
    reservas[idx] = novaReserva;
  } else {
    reservas.unshift(novaReserva);
  }

  localStorage.setItem(`${CHAVE_STORAGE_RESERVAS}${condominioId}`, JSON.stringify(reservas));

  // Tenta sincronizar Supabase
  if (isUUID(condominioId)) {
    try {
      await supabase.from('reservas_areas_comuns').upsert([novaReserva]);
    } catch {}
  }

  // Auditoria
  registrarAtividade({
    modulo: 'Reserva de Áreas',
    acao: idx >= 0 ? 'RESERVA_ATUALIZADA' : 'RESERVA_CRIADA',
    descricao: `Reserva para "${novaReserva.area_nome}" em ${novaReserva.data_reserva} (${novaReserva.unidade_bloco} - ${novaReserva.morador_nome}). Status: ${novaReserva.status.toUpperCase()}`,
    detalhes: novaReserva,
    operador_nome: operadorLogado?.nome || 'Operador',
    operador_id: operadorLogado?.id,
    condominio_id: condominioId
  });

  return { sucesso: true, reserva: novaReserva };
}

export async function atualizarStatusReserva(
  condominioId: string,
  reservaId: string,
  novoStatus: ReservaArea['status'],
  motivo?: string,
  operadorLogado?: any
): Promise<boolean> {
  const reservas = await carregarReservas(condominioId);
  const reserva = reservas.find(r => r.id === reservaId);
  if (!reserva) return false;

  reserva.status = novoStatus;
  if (novoStatus === 'recusada' || novoStatus === 'cancelada') {
    reserva.motivo_recusa = motivo;
  }
  if (novoStatus === 'aprovada') {
    reserva.aprovado_por_nome = operadorLogado?.nome || 'Administração';
    reserva.aprovado_em = new Date().toISOString();
  }

  localStorage.setItem(`${CHAVE_STORAGE_RESERVAS}${condominioId}`, JSON.stringify(reservas));

  if (isUUID(condominioId)) {
    try {
      await supabase
        .from('reservas_areas_comuns')
        .update({
          status: novoStatus,
          motivo_recusa: reserva.motivo_recusa,
          aprovado_por_nome: reserva.aprovado_por_nome,
          aprovado_em: reserva.aprovado_em
        })
        .eq('id', reservaId);
    } catch {}
  }

  registrarAtividade({
    modulo: 'Reserva de Áreas',
    acao: `STATUS_${novoStatus.toUpperCase()}`,
    descricao: `Reserva #${reserva.id.slice(0, 8)} (${reserva.area_nome} - ${reserva.unidade_bloco}) alterada para ${novoStatus.toUpperCase()}.${motivo ? ` Motivo: ${motivo}` : ''}`,
    detalhes: { reservaId, novoStatus, motivo },
    operador_nome: operadorLogado?.nome || 'Operador',
    operador_id: operadorLogado?.id,
    condominio_id: condominioId
  });

  return true;
}

export function formatarMensagemWhatsAppReserva(reserva: ReservaArea, condominioNome: string): string {
  const dataFormatada = new Date(reserva.data_reserva + 'T12:00:00').toLocaleDateString('pt-BR');
  const turnoTexto = {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
    dia_todo: 'Dia Inteiro',
    personalizado: 'Personalizado'
  }[reserva.turno] || reserva.turno;

  const statusEmoji = {
    aprovada: '✅ *CONFIRMADA & APROVADA*',
    pendente: '⏳ *PENDENTE DE APROVAÇÃO*',
    recusada: '❌ *SOLICITAÇÃO RECUSADA*',
    cancelada: '🚫 *RESERVA CANCELADA*',
    concluida: '🎉 *EVENTO CONCLUÍDO*'
  }[reserva.status];

  let msg = `*PORTTOHUB - ${condominioNome.toUpperCase()}*\n`;
  msg += `📋 *COMPROVANTE DE RESERVA DE ÁREA COMUM*\n\n`;
  msg += `📍 *Espaço:* ${reserva.area_nome}\n`;
  msg += `📅 *Data:* ${dataFormatada} (${turnoTexto})\n`;
  msg += `⏰ *Horário:* ${reserva.horario_inicio} às ${reserva.horario_fim}\n`;
  msg += `🏠 *Unidade:* ${reserva.unidade_bloco}\n`;
  msg += `👤 *Morador(a):* ${reserva.morador_nome}\n`;
  msg += `🎉 *Evento:* ${reserva.tipo_evento}\n`;
  msg += `👥 *Convidados Estimados:* ${reserva.qtd_convidados_estimada} pessoas\n`;
  msg += `💳 *Taxa Total:* R$ ${reserva.valor_total.toFixed(2)} (${reserva.pago ? 'Quitada' : 'Aguardando Pagamento'})\n`;
  msg += `📌 *Status:* ${statusEmoji}\n\n`;

  if (reserva.lista_convidados && reserva.lista_convidados.length > 0) {
    msg += `📝 *Lista de Convidados:* ${reserva.lista_convidados.length} cadastrados para liberação na portaria.\n\n`;
  }

  msg += `⚠️ *Lembrete:* Respeite as regras de convivência, limites de som e horário de entrega das chaves.\n`;
  msg += `_Mensagem gerada pelo PorttoHub._`;

  return msg;
}

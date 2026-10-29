import { supabase } from './supabase';
import { isUUID } from './condominioService';
import { registrarAtividade } from './auditoriaService';

export interface PontoAcesso {
  id: string;
  condominio_id: string;
  nome: string;
  tipo: 'pedestre' | 'veiculo' | 'misto';
  localizacao: string;
  ativo: boolean;
}

export interface RegistroAcesso {
  id: string;
  condominio_id: string;
  tipo: 'visitante' | 'prestador' | 'convidado_evento' | 'morador' | 'veiculo' | 'entrega';
  nome: string;
  documento: string;
  telefone?: string;
  empresa?: string;
  unidade_bloco: string;
  morador_responsavel?: string;
  ponto_acesso_entrada: string;
  ponto_acesso_saida?: string;
  veiculo_placa?: string;
  veiculo_modelo?: string;
  veiculo_cor?: string;
  data_hora_entrada: string;
  data_hora_saida?: string;
  status: 'presente' | 'saiu' | 'barrado';
  foto_entrada_url?: string;
  foto_saida_url?: string;
  operador_entrada_nome: string;
  operador_saida_nome?: string;
  observacoes?: string;
  cracha_ou_tag?: string;
  reserva_area_id?: string;
  passe_qr_id?: string;
  motivo_bloqueio?: string;
}

export interface PasseVirtualQR {
  id: string;
  token: string;
  condominio_id: string;
  morador_nome: string;
  morador_telefone?: string;
  unidade_bloco: string;
  visitante_nome: string;
  visitante_documento?: string;
  tipo: 'visitante' | 'festa_convidado' | 'prestador' | 'entrega';
  data_validade: string; // YYYY-MM-DD
  hora_inicio: string;
  hora_fim: string;
  max_usos: number;
  usos_realizados: number;
  status: 'valido' | 'utilizado' | 'expirado' | 'cancelado';
  observacoes?: string;
  criado_em: string;
}

export interface BloqueioSeguranca {
  id: string;
  condominio_id: string;
  tipo: 'pessoa' | 'veiculo';
  nome_ou_placa: string;
  documento?: string;
  motivo: string;
  gravidade: 'alerta' | 'bloqueio_total' | 'chamar_policia';
  registrado_por: string;
  ativo: boolean;
  criado_em: string;
}

const CHAVE_STORAGE_PONTOS = 'porttohub_pontos_acesso_';
const CHAVE_STORAGE_REGISTROS = 'porttohub_registros_acesso_';
const CHAVE_STORAGE_PASSES = 'porttohub_passes_virtuais_';
const CHAVE_STORAGE_BLACKLIST = 'porttohub_blacklist_';

export const PONTOS_PADRAO: Omit<PontoAcesso, 'id' | 'condominio_id'>[] = [
  { nome: 'Portaria Principal (Pedestres)', tipo: 'pedestre', localizacao: 'Entrada Social', ativo: true },
  { nome: 'Cancela 01 - Entrada de Veículos', tipo: 'veiculo', localizacao: 'Acesso Garagem', ativo: true },
  { nome: 'Cancela 02 - Saída de Veículos', tipo: 'veiculo', localizacao: 'Saída Garagem', ativo: true },
  { nome: 'Portão de Serviço & Prestadores', tipo: 'pedestre', localizacao: 'Docas / Carga', ativo: true },
  { nome: 'Portão Lateral Pedestres', tipo: 'pedestre', localizacao: 'Acesso Área de Lazer', ativo: true }
];

export async function carregarPontosAcesso(condominioId: string): Promise<PontoAcesso[]> {
  if (!condominioId) return [];

  if (isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('pontos_acesso')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('nome', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(`${CHAVE_STORAGE_PONTOS}${condominioId}`, JSON.stringify(data));
        return data as PontoAcesso[];
      }
    } catch {}
  }

  const cached = localStorage.getItem(`${CHAVE_STORAGE_PONTOS}${condominioId}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  const seeds: PontoAcesso[] = PONTOS_PADRAO.map((p, i) => ({
    ...p,
    id: `ponto-${condominioId.slice(0, 8)}-${i + 1}`,
    condominio_id: condominioId
  }));

  localStorage.setItem(`${CHAVE_STORAGE_PONTOS}${condominioId}`, JSON.stringify(seeds));
  return seeds;
}

export async function carregarRegistrosAcesso(condominioId: string): Promise<RegistroAcesso[]> {
  if (!condominioId) return [];

  if (isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('registros_acesso')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('data_hora_entrada', { ascending: false })
        .limit(300);

      if (!error && data) {
        localStorage.setItem(`${CHAVE_STORAGE_REGISTROS}${condominioId}`, JSON.stringify(data));
        return data as RegistroAcesso[];
      }
    } catch {}
  }

  const cached = localStorage.getItem(`${CHAVE_STORAGE_REGISTROS}${condominioId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  // Registros de exemplo realistas
  const agora = Date.now();
  const exemplos: RegistroAcesso[] = [
    {
      id: `acesso-${agora}-1`,
      condominio_id: condominioId,
      tipo: 'visitante',
      nome: 'Juliana Costa Ferreira',
      documento: '42.981.332-9',
      telefone: '(11) 98771-4433',
      unidade_bloco: 'Torre A - Apto 304',
      morador_responsavel: 'Felipe Costa',
      ponto_acesso_entrada: 'Portaria Principal (Pedestres)',
      data_hora_entrada: new Date(agora - 1000 * 60 * 45).toISOString(),
      status: 'presente',
      operador_entrada_nome: 'Marcos Silva (Portaria)',
      cracha_ou_tag: 'CR-042',
      observacoes: 'Visita autorizada pelo interfone'
    },
    {
      id: `acesso-${agora}-2`,
      condominio_id: condominioId,
      tipo: 'prestador',
      nome: 'Ricardo Almeida (Eletricista)',
      documento: '28.114.776-5',
      empresa: 'Volt Engenharia & Serviços',
      unidade_bloco: 'Torre B - Apto 701',
      morador_responsavel: 'Patrícia Prado',
      ponto_acesso_entrada: 'Portão de Serviço & Prestadores',
      veiculo_placa: 'BRA2E19',
      veiculo_modelo: 'Fiorino Branca',
      data_hora_entrada: new Date(agora - 1000 * 60 * 120).toISOString(),
      status: 'presente',
      operador_entrada_nome: 'Marcos Silva (Portaria)',
      cracha_ou_tag: 'PR-15',
      observacoes: 'Manutenção de disjuntor interno autorizada'
    },
    {
      id: `acesso-${agora}-3`,
      condominio_id: condominioId,
      tipo: 'entrega',
      nome: 'Lucas Gabriel (iFood)',
      documento: '50.334.887-2',
      unidade_bloco: 'Torre A - Apto 102',
      ponto_acesso_entrada: 'Portaria Principal (Pedestres)',
      ponto_acesso_saida: 'Portaria Principal (Pedestres)',
      data_hora_entrada: new Date(agora - 1000 * 60 * 180).toISOString(),
      data_hora_saida: new Date(agora - 1000 * 60 * 168).toISOString(),
      status: 'saiu',
      operador_entrada_nome: 'João Santos',
      operador_saida_nome: 'João Santos',
      observacoes: 'Morador desceu na eclusa para retirar refeição'
    }
  ];

  localStorage.setItem(`${CHAVE_STORAGE_REGISTROS}${condominioId}`, JSON.stringify(exemplos));
  return exemplos;
}

export async function carregarBlacklist(condominioId: string): Promise<BloqueioSeguranca[]> {
  if (!condominioId) return [];

  if (isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('blacklist_bloqueios')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('criado_em', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${CHAVE_STORAGE_BLACKLIST}${condominioId}`, JSON.stringify(data));
        return data as BloqueioSeguranca[];
      }
    } catch {}
  }

  const cached = localStorage.getItem(`${CHAVE_STORAGE_BLACKLIST}${condominioId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  const inicial: BloqueioSeguranca[] = [
    {
      id: 'blk-1',
      condominio_id: condominioId,
      tipo: 'pessoa',
      nome_ou_placa: 'Antônio Carlos Bezerra',
      documento: '19.882.331-0',
      motivo: 'Decisão judicial com ordem de afastamento e restrição de entrada.',
      gravidade: 'bloqueio_total',
      registrado_por: 'Administração Predial',
      ativo: true,
      criado_em: new Date(Date.now() - 86400000 * 10).toISOString()
    },
    {
      id: 'blk-2',
      condominio_id: condominioId,
      tipo: 'veiculo',
      nome_ou_placa: 'ABC-1234',
      motivo: 'Veículo com histórico de evasão sem cadastro de motorista.',
      gravidade: 'alerta',
      registrado_por: 'Supervisor de Segurança',
      ativo: true,
      criado_em: new Date(Date.now() - 86400000 * 20).toISOString()
    }
  ];

  localStorage.setItem(`${CHAVE_STORAGE_BLACKLIST}${condominioId}`, JSON.stringify(inicial));
  return inicial;
}

export async function verificarBloqueio(
  condominioId: string,
  documento?: string,
  nome?: string,
  placa?: string
): Promise<{ bloqueado: boolean; item?: BloqueioSeguranca }> {
  const lista = await carregarBlacklist(condominioId);
  const ativas = lista.filter(b => b.ativo);

  const docNorm = (documento || '').replace(/\D/g, '');
  const placaNorm = (placa || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const nomeNorm = (nome || '').trim().toLowerCase();

  for (const b of ativas) {
    if (b.tipo === 'veiculo' && placaNorm) {
      const bPlaca = b.nome_ou_placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (bPlaca && placaNorm.includes(bPlaca)) {
        return { bloqueado: true, item: b };
      }
    }

    if (b.tipo === 'pessoa') {
      if (docNorm && b.documento) {
        const bDoc = b.documento.replace(/\D/g, '');
        if (bDoc && bDoc === docNorm) {
          return { bloqueado: true, item: b };
        }
      }
      if (nomeNorm && b.nome_ou_placa) {
        if (nomeNorm.includes(b.nome_ou_placa.toLowerCase()) || b.nome_ou_placa.toLowerCase().includes(nomeNorm)) {
          return { bloqueado: true, item: b };
        }
      }
    }
  }

  return { bloqueado: false };
}

export async function salvarItemBlacklist(
  condominioId: string,
  item: Partial<BloqueioSeguranca>,
  operadorLogado?: any
): Promise<BloqueioSeguranca> {
  const lista = await carregarBlacklist(condominioId);
  const id = item.id || `blk-${Date.now()}`;

  const novo: BloqueioSeguranca = {
    id,
    condominio_id: condominioId,
    tipo: item.tipo || 'pessoa',
    nome_ou_placa: item.nome_ou_placa || '',
    documento: item.documento || '',
    motivo: item.motivo || 'Sem motivo especificado',
    gravidade: item.gravidade || 'bloqueio_total',
    registrado_por: operadorLogado?.nome || 'Operador',
    ativo: item.ativo !== false,
    criado_em: item.criado_em || new Date().toISOString()
  };

  const idx = lista.findIndex(b => b.id === id);
  if (idx >= 0) lista[idx] = novo;
  else lista.unshift(novo);

  localStorage.setItem(`${CHAVE_STORAGE_BLACKLIST}${condominioId}`, JSON.stringify(lista));

  if (isUUID(condominioId)) {
    try {
      await supabase.from('blacklist_bloqueios').upsert([novo]);
    } catch {}
  }

  registrarAtividade({
    modulo: 'Controle de Acesso',
    acao: 'BLACKLIST_ATUALIZADA',
    descricao: `Registro na lista de bloqueio/alerta: ${novo.nome_ou_placa} (${novo.gravidade.toUpperCase()}). Motivo: ${novo.motivo}`,
    detalhes: novo,
    operador_nome: operadorLogado?.nome || 'Operador',
    operador_id: operadorLogado?.id,
    condominio_id: condominioId
  });

  return novo;
}

export async function registrarEntradaAcesso(
  condominioId: string,
  dados: Partial<RegistroAcesso>,
  operadorLogado?: any
): Promise<{ sucesso: boolean; registro?: RegistroAcesso; erro?: string; alertaBloqueio?: BloqueioSeguranca }> {
  if (!condominioId || !dados.nome || !dados.unidade_bloco) {
    return { sucesso: false, erro: 'Informe o nome completo e a unidade de destino.' };
  }

  // Checagem de segurança
  const checagem = await verificarBloqueio(condominioId, dados.documento, dados.nome, dados.veiculo_placa);
  if (checagem.bloqueado && checagem.item?.gravidade === 'bloqueio_total') {
    return {
      sucesso: false,
      erro: `ACESSO BARRADO: Consta na Lista de Bloqueios (${checagem.item.motivo})`,
      alertaBloqueio: checagem.item
    };
  }

  const registros = await carregarRegistrosAcesso(condominioId);
  const id = `acesso-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const novo: RegistroAcesso = {
    id,
    condominio_id: condominioId,
    tipo: dados.tipo || 'visitante',
    nome: dados.nome.trim(),
    documento: dados.documento || '',
    telefone: dados.telefone || '',
    empresa: dados.empresa || '',
    unidade_bloco: dados.unidade_bloco,
    morador_responsavel: dados.morador_responsavel || '',
    ponto_acesso_entrada: dados.ponto_acesso_entrada || 'Portaria Principal (Pedestres)',
    veiculo_placa: dados.veiculo_placa ? dados.veiculo_placa.toUpperCase().trim() : undefined,
    veiculo_modelo: dados.veiculo_modelo || undefined,
    veiculo_cor: dados.veiculo_cor || undefined,
    data_hora_entrada: dados.data_hora_entrada || new Date().toISOString(),
    status: 'presente',
    foto_entrada_url: dados.foto_entrada_url,
    operador_entrada_nome: operadorLogado?.nome || 'Portaria',
    observacoes: dados.observacoes || '',
    cracha_ou_tag: dados.cracha_ou_tag || '',
    reserva_area_id: dados.reserva_area_id,
    passe_qr_id: dados.passe_qr_id
  };

  registros.unshift(novo);
  localStorage.setItem(`${CHAVE_STORAGE_REGISTROS}${condominioId}`, JSON.stringify(registros));

  if (isUUID(condominioId)) {
    try {
      await supabase.from('registros_acesso').insert([novo]);
    } catch {}
  }

  registrarAtividade({
    modulo: 'Controle de Acesso',
    acao: 'ENTRADA_REGISTRADA',
    descricao: `Entrada liberada para ${novo.tipo.toUpperCase()}: ${novo.nome}${novo.veiculo_placa ? ` (Placa: ${novo.veiculo_placa})` : ''} -> Unidade ${novo.unidade_bloco} via ${novo.ponto_acesso_entrada}.`,
    detalhes: novo,
    operador_nome: operadorLogado?.nome || 'Operador',
    operador_id: operadorLogado?.id,
    condominio_id: condominioId
  });

  return { sucesso: true, registro: novo, alertaBloqueio: checagem.item };
}

export async function registrarSaidaAcesso(
  condominioId: string,
  registroId: string,
  pontoSaida?: string,
  observacao?: string,
  operadorLogado?: any
): Promise<boolean> {
  const registros = await carregarRegistrosAcesso(condominioId);
  const reg = registros.find(r => r.id === registroId);
  if (!reg) return false;

  reg.status = 'saiu';
  reg.data_hora_saida = new Date().toISOString();
  reg.ponto_acesso_saida = pontoSaida || reg.ponto_acesso_entrada || 'Portaria Principal';
  reg.operador_saida_nome = operadorLogado?.nome || 'Portaria';
  if (observacao) {
    reg.observacoes = reg.observacoes ? `${reg.observacoes} | Saída: ${observacao}` : `Saída: ${observacao}`;
  }

  localStorage.setItem(`${CHAVE_STORAGE_REGISTROS}${condominioId}`, JSON.stringify(registros));

  if (isUUID(condominioId)) {
    try {
      await supabase
        .from('registros_acesso')
        .update({
          status: 'saiu',
          data_hora_saida: reg.data_hora_saida,
          ponto_acesso_saida: reg.ponto_acesso_saida,
          operador_saida_nome: reg.operador_saida_nome,
          observacoes: reg.observacoes
        })
        .eq('id', registroId);
    } catch {}
  }

  registrarAtividade({
    modulo: 'Controle de Acesso',
    acao: 'SAIDA_REGISTRADA',
    descricao: `Saída registrada para ${reg.nome} (${reg.tipo}) da unidade ${reg.unidade_bloco} via ${reg.ponto_acesso_saida}.`,
    detalhes: { registroId, saida: reg.data_hora_saida },
    operador_nome: operadorLogado?.nome || 'Operador',
    operador_id: operadorLogado?.id,
    condominio_id: condominioId
  });

  return true;
}

export async function carregarPassesVirtuais(condominioId: string): Promise<PasseVirtualQR[]> {
  if (!condominioId) return [];

  if (isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('passes_virtuais_qr')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('criado_em', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${CHAVE_STORAGE_PASSES}${condominioId}`, JSON.stringify(data));
        return data as PasseVirtualQR[];
      }
    } catch {}
  }

  const cached = localStorage.getItem(`${CHAVE_STORAGE_PASSES}${condominioId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  const hoje = new Date().toISOString().split('T')[0];
  const exemplos: PasseVirtualQR[] = [
    {
      id: 'qr-passe-1',
      token: 'PASS-CONV-98214',
      condominio_id: condominioId,
      morador_nome: 'Carlos Eduardo Mendes',
      morador_telefone: '(11) 98844-2211',
      unidade_bloco: 'Torre A - Apto 502',
      visitante_nome: 'Mariana Lima Silveira',
      tipo: 'festa_convidado',
      data_validade: hoje,
      hora_inicio: '18:00',
      hora_fim: '23:30',
      max_usos: 2,
      usos_realizados: 0,
      status: 'valido',
      observacoes: 'Aniversário no Salão de Festas Nobre',
      criado_em: new Date().toISOString()
    }
  ];

  localStorage.setItem(`${CHAVE_STORAGE_PASSES}${condominioId}`, JSON.stringify(exemplos));
  return exemplos;
}

export async function gerarPasseVirtual(
  condominioId: string,
  dados: Partial<PasseVirtualQR>,
  operadorLogado?: any
): Promise<PasseVirtualQR> {
  const passes = await carregarPassesVirtuais(condominioId);
  const id = `passe-${Date.now()}`;
  const token = `PASS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const novo: PasseVirtualQR = {
    id,
    token,
    condominio_id: condominioId,
    morador_nome: dados.morador_nome || 'Morador Responsável',
    morador_telefone: dados.morador_telefone || '',
    unidade_bloco: dados.unidade_bloco || 'Geral',
    visitante_nome: dados.visitante_nome || 'Convidado / Visitante',
    visitante_documento: dados.visitante_documento || '',
    tipo: dados.tipo || 'visitante',
    data_validade: dados.data_validade || new Date().toISOString().split('T')[0],
    hora_inicio: dados.hora_inicio || '08:00',
    hora_fim: dados.hora_fim || '22:00',
    max_usos: Number(dados.max_usos) || 1,
    usos_realizados: 0,
    status: 'valido',
    observacoes: dados.observacoes || '',
    criado_em: new Date().toISOString()
  };

  passes.unshift(novo);
  localStorage.setItem(`${CHAVE_STORAGE_PASSES}${condominioId}`, JSON.stringify(passes));

  if (isUUID(condominioId)) {
    try {
      await supabase.from('passes_virtuais_qr').insert([novo]);
    } catch {}
  }

  registrarAtividade({
    modulo: 'Controle de Acesso',
    acao: 'PASSE_VIRTUAL_GERADO',
    descricao: `Passe Virtual QR (${novo.token}) emitido para ${novo.visitante_nome} (Destino: ${novo.unidade_bloco} - ${novo.morador_nome}).`,
    detalhes: novo,
    operador_nome: operadorLogado?.nome || 'Operador',
    operador_id: operadorLogado?.id,
    condominio_id: condominioId
  });

  return novo;
}

export async function validarTokenPasse(
  condominioId: string,
  codigoOuToken: string
): Promise<{ valido: boolean; passe?: PasseVirtualQR; motivo?: string }> {
  const passes = await carregarPassesVirtuais(condominioId);
  const tokenLimpo = (codigoOuToken || '').trim().toUpperCase();

  const passe = passes.find(p => p.token.toUpperCase() === tokenLimpo || p.id === codigoOuToken);
  if (!passe) {
    return { valido: false, motivo: 'Passe Virtual não encontrado ou token inválido.' };
  }

  if (passe.status !== 'valido') {
    return { valido: false, passe, motivo: `Passe está marcado como ${passe.status.toUpperCase()}.` };
  }

  const hoje = new Date().toISOString().split('T')[0];
  if (passe.data_validade < hoje) {
    passe.status = 'expirado';
    localStorage.setItem(`${CHAVE_STORAGE_PASSES}${condominioId}`, JSON.stringify(passes));
    return { valido: false, passe, motivo: `Passe expirou na data ${passe.data_validade}.` };
  }

  if (passe.usos_realizados >= passe.max_usos) {
    passe.status = 'utilizado';
    localStorage.setItem(`${CHAVE_STORAGE_PASSES}${condominioId}`, JSON.stringify(passes));
    return { valido: false, passe, motivo: 'Limite de utilizações deste passe já foi atingido.' };
  }

  return { valido: true, passe };
}

export function formatarMensagemWhatsAppPasse(passe: PasseVirtualQR, condominioNome: string): string {
  const dataFormatada = new Date(passe.data_validade + 'T12:00:00').toLocaleDateString('pt-BR');
  let msg = `*PORTTOHUB - ${condominioNome.toUpperCase()}*\n`;
  msg += `🎫 *CONVITE & PASSE VIRTUAL DE ACESSO*\n\n`;
  msg += `Olá, *${passe.visitante_nome}*!\n`;
  msg += `Você possui autorização de entrada pré-aprovada para:\n\n`;
  msg += `🏠 *Unidade de Destino:* ${passe.unidade_bloco}\n`;
  msg += `👤 *Anfitrião(ã):* ${passe.morador_nome}\n`;
  msg += `📅 *Válido para o Dia:* ${dataFormatada}\n`;
  msg += `⏰ *Janela de Horário:* Das ${passe.hora_inicio} às ${passe.hora_fim}\n`;
  msg += `🔑 *CÓDIGO DE ACESSO:* \`${passe.token}\`\n\n`;
  if (passe.observacoes) {
    msg += `📌 *Nota:* ${passe.observacoes}\n\n`;
  }
  msg += `Ao chegar na guarita/portaria, apresente este código ou informe ao operador para liberação imediata e ágil sem burocracia!\n`;
  msg += `_Emitido com segurança via PorttoHub._`;
  return msg;
}

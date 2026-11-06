export type UserRole = 'admin' | 'supervisor' | 'funcionario';

export type TipoEscala = 'regular' | 'ft_cobertura' | 'substituicao_atestado' | 'substituicao_ferias';

export type StatusPosto = 'coberto' | 'vazio' | 'em_andamento' | 'finalizado';

export type TagAtiva = 
  | 'regular'                 // 🟢 No Posto (Regular)
  | 'intervalo'               // 🟡 Em Intervalo
  | 'falta'                   // 🔴 Posto Vazio / Falta
  | 'escalado_cobertura'      // 🔄 [Escalado para Cobertura]
  | 'trabalhando_folga_ft';   // ⚡ [Trabalhando em Dia de Folga / FT]

export type TipoOcorrencia = 
  | 'falta_nao_justificada'
  | 'ft_trabalhada'
  | 'atestado_aprovado'
  | 'atestado_rejeitado';

export type StatusProcessamento = 'pendente' | 'descontar' | 'pagar_ft' | 'abonado';

export type TipoBatida = 
  | 'entrada' 
  | 'inicio_intervalo' 
  | 'fim_intervalo' 
  | 'saida'
  | 'saida_intervalo'    // Alias legado compativel
  | 'retorno_intervalo'; // Alias legado compativel

export interface Profile {
  id: string;
  cpf: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  disponivel_ft: boolean;
  primeiro_acesso_concluido: boolean;
  cargo?: string;
  telefone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  bairro?: string;
  cidade?: string;
  lat: number;
  lng: number;
  latitude?: number;  // Alias Supabase
  longitude?: number; // Alias Supabase
  raio_tolerancia_metros: number;
  raio_metros?: number; // Alias Supabase
  contato_emergencia?: string;
  tipo_posto?: 'portaria_24h' | 'controle_acesso' | 'ronda' | 'recepcao';
}

export interface EscalaTrabalho {
  id: string;
  funcionario_id?: string | null;
  funcionario?: Profile | null;
  condominio_id: string;
  condominio?: Condominio | null;
  data_escala: string;
  turno_inicio: string;
  turno_fim: string;
  tipo_escala: TipoEscala;
  status_posto: StatusPosto;
  tag_ativa: TagAtiva;
  ultima_batida?: string | null;
  created_at?: string;
}

export interface ApontamentoFolha {
  id: string;
  funcionario_id: string;
  funcionario?: Profile | null;
  data_ocorrencia: string;
  tipo_ocorrencia: TipoOcorrencia;
  status_processamento: StatusProcessamento;
  observacao?: string | null;
  valor_calculado?: number;
  anexo_url?: string | null;
  crm_medico?: string | null;
  dias_afastamento?: number | null;
  created_at?: string;
}

export interface RegistroPonto {
  id: string;
  funcionario_id: string;
  condominio_id?: string;
  escala_id?: string;
  tipo_batida: TipoBatida;
  timestamp: string;
  timestamp_batida?: string;
  lat: number;
  lng: number;
  latitude_capturada?: number;
  longitude_capturada?: number;
  distancia_metros: number;
  dentro_do_raio: boolean;
  foto_comprovante?: string | null;
  foto_comprovante_url?: string | null;
  condominio_nome?: string;
  sincronizado_offline?: boolean;
  offline_pendente?: boolean;
  hash_criptografico?: string;
  created_at?: string;
}

export type StatusHolerite = 'rascunho' | 'publicado';

export type TipoItemHolerite = 'provento' | 'desconto';

export interface ItemDemonstrativo {
  id: string;
  demonstrativo_id: string;
  codigo: string;
  descricao: string;
  referencia?: string;
  tipo: TipoItemHolerite;
  valor: number;
  ordem?: number;
  created_at?: string;
}

export interface DemonstrativoPagamento {
  id: string;
  funcionario_id: string;
  funcionario?: Profile | null;
  mes_referencia: string; // Ex: '2026-03'
  salario_base: number;
  total_proventos: number;
  total_descontos: number;
  salario_liquido: number;
  base_inss: number;
  base_fgts: number;
  valor_fgts: number;
  base_irrf: number;
  status: StatusHolerite;
  data_pagamento?: string;
  ciente_funcionario_em?: string | null;
  observacoes?: string;
  itens?: ItemDemonstrativo[];
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// MÓDULO: GESTÃO DE ESCALAS, FOLGAS E COBERTURA DE POSTOS (FT)
// ============================================================================

export type RegimeJornada = '12x36' | '6x1' | '5x2';

export type TurnoTipo = 'diurno_07_19' | 'noturno_19_07' | 'comercial_08_17';

export type StatusDiaEscala = 
  | 'trabalho'   // 🟩 Trabalho regular
  | 'folga'      // 🟦 Folga programada
  | 'ft'         // ⚡ Folga Trabalhada (Turno Extra)
  | 'cobertura'  // 🔄 Escalado para Cobertura
  | 'falta'      // 🟥 Falta não justificada / Posto Vazio
  | 'atestado'   // 📄 Atestado Médico
  | 'ferias';    // 🟨 Férias

export interface VinculoEscala {
  id: string;
  funcionario_id: string;
  funcionario?: Profile | null;
  condominio_id: string;
  condominio?: Condominio | null;
  regime_jornada: RegimeJornada;
  turno_tipo: TurnoTipo;
  data_inicio: string; // Ex: '2026-03-01' (data base para cálculo de paridade 12x36 ou ciclo 6x1/5x2)
  dias_folga_fixa?: number[]; // [0] = Domingo, [6] = Sábado
  paridade_12x36?: 'par' | 'impar'; // Para 12x36
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EscalaOperacionalDia {
  id: string;
  vinculo_id?: string;
  funcionario_id: string;
  funcionario?: Profile | null;
  condominio_id: string;
  condominio?: Condominio | null;
  data: string; // 'YYYY-MM-DD'
  dia_mes: number; // 1 a 31
  dia_semana: number; // 0 = Domingo, 6 = Sábado
  status: StatusDiaEscala;
  turno_inicio: string;
  turno_fim: string;
  cobertura_de_funcionario_id?: string | null;
  cobertura_de_funcionario_nome?: string | null;
  motivo_cobertura?: 'falta' | 'atestado' | 'ferias' | 'emergencia';
  valor_ft?: number; // Padrão R$ 240,00 quando status === 'ft'
  observacao?: string;
  created_at?: string;
  updated_at?: string;
}


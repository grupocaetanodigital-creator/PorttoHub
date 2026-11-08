export type UserRole = 'supervisor' | 'operacional' | 'rh';

export type JourneyType = '12x36' | '6x1' | '5x2' | '12x36_noturno';

export type ShiftPeriod = 'diurno' | 'noturno';

export type PostStatus = 'coberto' | 'vazio' | 'em_ft' | 'em_atraso';

export type DayStatus = 'trabalho' | 'folga' | 'ft' | 'falta' | 'atestado';

export type OperationalTeamFilter = 'todos' | 'no_posto' | 'de_folga' | 'em_falta' | 'afastado';

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  cpf?: string;
  matricula?: string;
  role: UserRole;
  avatarUrl: string;
  phone?: string;
  cargo: string;
  condominioId?: string;
}

export interface CondominioPosto {
  id: string;
  nome: string;
  tipo: 'Residencial' | 'Comercial' | 'Condomínio Fechado' | 'Indústria';
  endereco: string;
  cidade: string;
  uf: string;
  latitude: number;
  longitude: number;
  raioGpsMetros: number;
  postosRequeridosDia: number;
  postosRequeridosNoite: number;
  contatoSindico: string;
  telefoneSindico: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  cargo: 'Porteiro Líder' | 'Porteiro' | 'Controlador de Acesso' | 'Vigilante' | 'Zelador' | 'Recepcionista';
  jornada: JourneyType;
  condominioId: string;
  fotoUrl: string;
  telefone: string;
  ativo: boolean;
  salarioBase: number;
  chavePix?: string;
  dataAdmissao: string;
  statusHoje?: 'no_posto' | 'de_folga' | 'em_falta' | 'afastado';
  motivoAfastamento?: string;
  dataRetornoPrevista?: string;
}

export interface OcorrenciaLivro {
  id: string;
  condominioId: string;
  dataHora: string;
  autorNome: string;
  autorCargo: string;
  titulo: string;
  descricao: string;
  gravidade: 'baixa' | 'media' | 'alta';
}

export interface TurnoPosto {
  id: string;
  condominioId: string;
  postoNome: string;
  data: string; // YYYY-MM-DD
  periodo: ShiftPeriod;
  horario: string; // ex: 07:00 - 19:00
  status: PostStatus;
  colaboradorTitularId?: string;
  colaboradorAtualId?: string; // Se for FT ou substituto
  motivoVazio?: string;
  horaAlerta?: string;
  ftDesignada?: boolean;
  observacao?: string;
}

export interface MatrizDiaItem {
  data: string;
  status: DayStatus;
  observacao?: string;
  substitutoId?: string;
}

export interface ColaboradorEscala {
  colaboradorId: string;
  dias: Record<string, DayStatus>; // "2026-11-07": "trabalho"
}

export type HoleriteItemTipo = 'provento' | 'desconto';

export interface HoleriteItem {
  id: string;
  codigo: string;
  descricao: string;
  referencia: string; // ex: 220h, 30%, 20d, 50%
  tipo: HoleriteItemTipo;
  valor: number;
}

export interface Holerite {
  id: string;
  colaboradorId: string;
  mesReferencia: string; // ex: 11/2026
  dataEmissao: string;
  salarioBase: number;
  itens: HoleriteItem[];
  totalProventos: number;
  totalDescontos: number;
  valorLiquido: number;
  publicado: boolean;
  dataPublicacao?: string;
  observacoesRH?: string;
}

export type NavigationTab = 'operacao' | 'equipe' | 'postos' | 'matriz' | 'holerite';

import { Colaborador, CondominioPosto, Holerite, TurnoPosto, User } from '../types';

export const DEFAULT_ADMIN_CREDENTIALS = {
  login: 'caetano',
  password: '6814871984@Lm'
};

export const INITIAL_SUPERVISOR_USER: User = {
  id: 'sup-1',
  name: 'Caetano',
  username: 'caetano',
  email: 'caetano@porttohub.com.br',
  role: 'supervisor',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  phone: '(11) 98765-4321',
  cargo: 'Administrador / Gestor Geral'
};

export const INITIAL_OPERATIONAL_USER: User = {
  id: 'colab-1',
  name: 'Marcos Vinícius Silva',
  cpf: '123.456.789-00',
  matricula: 'TC-1042',
  role: 'operacional',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  phone: '(11) 97123-8899',
  cargo: 'Porteiro Líder',
  condominioId: 'condo-1'
};

export const INITIAL_CONDOS: CondominioPosto[] = [
  {
    id: 'condo-1',
    nome: 'Residencial Jardins do Lago',
    tipo: 'Residencial',
    endereco: 'Av. das Acácias, 850 - Jardins, São Paulo - SP',
    cidade: 'São Paulo',
    uf: 'SP',
    latitude: -23.5682,
    longitude: -46.6621,
    raioGpsMetros: 60,
    postosRequeridosDia: 2,
    postosRequeridosNoite: 2,
    contatoSindico: 'Dr. Roberto Almeida',
    telefoneSindico: '(11) 99123-4411'
  },
  {
    id: 'condo-2',
    nome: 'Edifício Horizon Corporate',
    tipo: 'Comercial',
    endereco: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
    cidade: 'São Paulo',
    uf: 'SP',
    latitude: -23.5855,
    longitude: -46.6804,
    raioGpsMetros: 50,
    postosRequeridosDia: 3,
    postosRequeridosNoite: 2,
    contatoSindico: 'Eng. Patrícia Silveira',
    telefoneSindico: '(11) 98844-5500'
  },
  {
    id: 'condo-3',
    nome: 'Residencial Villa Firenze',
    tipo: 'Residencial',
    endereco: 'Rua Alberto Faria, 412 - Morumbi, São Paulo - SP',
    cidade: 'São Paulo',
    uf: 'SP',
    latitude: -23.5989,
    longitude: -46.7118,
    raioGpsMetros: 75,
    postosRequeridosDia: 2,
    postosRequeridosNoite: 1,
    contatoSindico: 'Mariana Fontes',
    telefoneSindico: '(11) 97722-1133'
  },
  {
    id: 'condo-4',
    nome: 'Condomínio Golden Park Alphaville',
    tipo: 'Condomínio Fechado',
    endereco: 'Al. Rio Negro, 1200 - Alphaville Industrial, Barueri - SP',
    cidade: 'Barueri',
    uf: 'SP',
    latitude: -23.4981,
    longitude: -46.8523,
    raioGpsMetros: 100,
    postosRequeridosDia: 4,
    postosRequeridosNoite: 3,
    contatoSindico: 'Celso Antunes',
    telefoneSindico: '(11) 99344-9988'
  }
];

export const INITIAL_COLABORADORES: Colaborador[] = [
  {
    id: 'colab-1',
    nome: 'Marcos Vinícius Silva',
    cpf: '123.456.789-00',
    matricula: 'TC-1042',
    cargo: 'Porteiro Líder',
    jornada: '12x36',
    condominioId: 'condo-1',
    fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 97123-8899',
    ativo: true,
    salarioBase: 2450.00,
    dataAdmissao: '2023-04-15',
    statusHoje: 'no_posto'
  },
  {
    id: 'colab-2',
    nome: 'Cláudio Ferreira de Souza',
    cpf: '234.567.890-11',
    matricula: 'TC-1088',
    cargo: 'Controlador de Acesso',
    jornada: '12x36',
    condominioId: 'condo-2',
    fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 98234-7711',
    ativo: true,
    salarioBase: 2180.00,
    dataAdmissao: '2023-08-10',
    statusHoje: 'em_falta',
    motivoAfastamento: 'Falta não justificada na escala diurna'
  },
  {
    id: 'colab-3',
    nome: 'Rogério Batista dos Santos',
    cpf: '345.678.901-22',
    matricula: 'TC-1102',
    cargo: 'Vigilante',
    jornada: '12x36_noturno',
    condominioId: 'condo-1',
    fotoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 99455-2233',
    ativo: true,
    salarioBase: 2680.00,
    dataAdmissao: '2022-11-01',
    statusHoje: 'no_posto'
  },
  {
    id: 'colab-4',
    nome: 'Anderson Ribeiro Alves',
    cpf: '456.789.012-33',
    matricula: 'TC-1135',
    cargo: 'Porteiro',
    jornada: '12x36',
    condominioId: 'condo-3',
    fotoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 98899-3344',
    ativo: true,
    salarioBase: 2250.00,
    dataAdmissao: '2024-01-20',
    statusHoje: 'de_folga'
  },
  {
    id: 'colab-5',
    nome: 'Edvaldo Lima Pereira',
    cpf: '567.890.123-44',
    matricula: 'TC-1190',
    cargo: 'Porteiro',
    jornada: '12x36',
    condominioId: 'condo-4',
    fotoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 97711-4455',
    ativo: true,
    salarioBase: 2250.00,
    dataAdmissao: '2024-03-05',
    statusHoje: 'no_posto'
  },
  {
    id: 'colab-6',
    nome: 'Fabiana Moreira Castro',
    cpf: '678.901.234-55',
    matricula: 'TC-1215',
    cargo: 'Controlador de Acesso',
    jornada: '5x2',
    condominioId: 'condo-2',
    fotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 96622-7788',
    ativo: true,
    salarioBase: 2320.00,
    dataAdmissao: '2023-02-14',
    statusHoje: 'no_posto'
  },
  {
    id: 'colab-7',
    nome: 'Rodrigo Barbosa Neves',
    cpf: '789.012.345-66',
    matricula: 'TC-1240',
    cargo: 'Vigilante',
    jornada: '12x36',
    condominioId: 'condo-1',
    fotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 95533-2211',
    ativo: true,
    salarioBase: 2680.00,
    dataAdmissao: '2022-06-20',
    statusHoje: 'afastado',
    motivoAfastamento: 'Atestado Médico (CID M54.5 - Lombalgia Aguda)',
    dataRetornoPrevista: '12/11/2026'
  },
  {
    id: 'colab-8',
    nome: 'Daniel Monteiro de Paula',
    cpf: '890.123.456-77',
    matricula: 'TC-1288',
    cargo: 'Porteiro',
    jornada: '6x1',
    condominioId: 'condo-4',
    fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    telefone: '(11) 94411-9988',
    ativo: true,
    salarioBase: 2250.00,
    dataAdmissao: '2024-02-10',
    statusHoje: 'de_folga'
  }
];

export const INITIAL_OCORRENCIAS = [
  {
    id: 'oco-1',
    condominioId: 'condo-2',
    dataHora: '2026-11-07 07:15',
    autorNome: 'Carlos Mendes',
    autorCargo: 'Supervisor Operacional',
    titulo: 'Ausência de Porteiro na Troca de Turno',
    descricao: 'O colaborador Cláudio Souza não compareceu ao posto às 07:00. Acionado plano de contingência e busca de cobertura FT.',
    gravidade: 'alta' as const
  },
  {
    id: 'oco-2',
    condominioId: 'condo-1',
    dataHora: '2026-11-07 06:58',
    autorNome: 'Marcos Vinícius Silva',
    autorCargo: 'Porteiro Líder',
    titulo: 'Passagem de Serviço sem Anormalidades',
    descricao: 'Assumido posto da portaria social e guarita. Todos os rádios HT e controle de TAGs dos moradores testados e operacionais.',
    gravidade: 'baixa' as const
  },
  {
    id: 'oco-3',
    condominioId: 'condo-3',
    dataHora: '2026-11-06 22:40',
    autorNome: 'Edvaldo Lima Pereira',
    autorCargo: 'Porteiro FT',
    titulo: 'Manutenção no Portão da Garagem 02',
    descricao: 'Motor do portão de visitantes apresentou lentidão. Acionada assistência técnica autorizada e síndico avisado.',
    gravidade: 'media' as const
  }
];

export const INITIAL_TURNOS: TurnoPosto[] = [
  {
    id: 'turno-1',
    condominioId: 'condo-2',
    postoNome: 'Portaria Social - Posto 01',
    data: '2026-11-07',
    periodo: 'diurno',
    horario: '07:00 - 19:00',
    status: 'vazio', // Demonstrates the requested 🔴 POSTO VAZIO
    colaboradorTitularId: 'colab-2', // Cláudio Souza
    motivoVazio: 'Falta não comunicada (Atraso superior a 50 min)',
    horaAlerta: '07:50',
    ftDesignada: false,
    observacao: 'Tentativa de contato via WhatsApp sem resposta. Necessário designar FT imediatamente.'
  },
  {
    id: 'turno-2',
    condominioId: 'condo-1',
    postoNome: 'Portaria Principal 24h',
    data: '2026-11-07',
    periodo: 'diurno',
    horario: '07:00 - 19:00',
    status: 'coberto',
    colaboradorTitularId: 'colab-1', // Marcos Silva
    colaboradorAtualId: 'colab-1',
    horaAlerta: undefined,
    ftDesignada: false,
    observacao: 'Ponto registrado via GPS (Raio OK - 12m do posto).'
  },
  {
    id: 'turno-3',
    condominioId: 'condo-3',
    postoNome: 'Portaria Garagem & Visitantes',
    data: '2026-11-07',
    periodo: 'diurno',
    horario: '07:00 - 19:00',
    status: 'em_ft', // Demonstrates ⚡ FTs Ativas
    colaboradorTitularId: 'colab-4',
    colaboradorAtualId: 'colab-5', // Edvaldo Lima cobrindo em Folga Trabalhada
    ftDesignada: true,
    observacao: 'FT autorizada pela supervisão (Edvaldo Lima substituindo em sua folga).'
  },
  {
    id: 'turno-4',
    condominioId: 'condo-4',
    postoNome: 'Guarita Central 01',
    data: '2026-11-07',
    periodo: 'diurno',
    horario: '07:00 - 19:00',
    status: 'coberto',
    colaboradorTitularId: 'colab-5',
    colaboradorAtualId: 'colab-5',
    ftDesignada: false,
    observacao: 'Ponto registrado no horário normal.'
  },
  {
    id: 'turno-5',
    condominioId: 'condo-1',
    postoNome: 'Vigilância Noturna Ronda',
    data: '2026-11-07',
    periodo: 'noturno',
    horario: '19:00 - 07:00',
    status: 'coberto',
    colaboradorTitularId: 'colab-3', // Rogério Santos
    colaboradorAtualId: 'colab-3',
    ftDesignada: false,
    observacao: 'Escala confirmada para início às 19h.'
  }
];

export const INITIAL_HOLERITES: Holerite[] = [
  {
    id: 'hol-1',
    colaboradorId: 'colab-1', // Marcos Silva
    mesReferencia: '10/2026',
    dataEmissao: '2026-11-05',
    salarioBase: 2450.00,
    itens: [
      { id: 'item-1', codigo: '001', descricao: 'Salário Base Contratual', referencia: '220h', tipo: 'provento', valor: 2450.00 },
      { id: 'item-2', codigo: '105', descricao: 'Gratificação de Posto (Líder)', referencia: '30%', tipo: 'provento', valor: 735.00 },
      { id: 'item-3', codigo: '120', descricao: 'Horas Extras 50% (FT Cobertura)', referencia: '12h', tipo: 'provento', valor: 200.45 },
      { id: 'item-4', codigo: '150', descricao: 'Auxílio Alimentação / VR', referencia: '22d', tipo: 'provento', valor: 550.00 },
      { id: 'item-5', codigo: '501', descricao: 'INSS s/ Folha de Pagamento', referencia: '9.0%', tipo: 'desconto', valor: 286.69 },
      { id: 'item-6', codigo: '510', descricao: 'Vale Transporte (Desconto 6%)', referencia: '6%', tipo: 'desconto', valor: 147.00 },
      { id: 'item-7', codigo: '520', descricao: 'Adiantamento Quinzenal (Vale)', referencia: '40%', tipo: 'desconto', valor: 980.00 }
    ],
    totalProventos: 3935.45,
    totalDescontos: 1413.69,
    valorLiquido: 2521.76,
    publicado: true,
    dataPublicacao: '2026-11-05 14:30',
    observacoesRH: 'Competência Outubro/2026 creditada no Banco Santander.'
  },
  {
    id: 'hol-2',
    colaboradorId: 'colab-5', // Edvaldo Lima
    mesReferencia: '10/2026',
    dataEmissao: '2026-11-05',
    salarioBase: 2250.00,
    itens: [
      { id: 'item-201', codigo: '001', descricao: 'Salário Base Contratual', referencia: '220h', tipo: 'provento', valor: 2250.00 },
      { id: 'item-202', codigo: '121', descricao: 'Folga Trabalhada (FT Dobrada)', referencia: '24h', tipo: 'provento', valor: 409.09 },
      { id: 'item-203', codigo: '130', descricao: 'Adicional de Assiduidade', referencia: '100%', tipo: 'provento', valor: 150.00 },
      { id: 'item-204', codigo: '501', descricao: 'INSS s/ Folha de Pagamento', referencia: '8.5%', tipo: 'desconto', valor: 221.77 },
      { id: 'item-205', codigo: '510', descricao: 'Vale Transporte (6%)', referencia: '6%', tipo: 'desconto', valor: 135.00 }
    ],
    totalProventos: 2809.09,
    totalDescontos: 356.77,
    valorLiquido: 2452.32,
    publicado: true,
    dataPublicacao: '2026-11-05 16:00',
    observacoesRH: 'Competência Outubro/2026 com 2 FTs computadas.'
  }
];

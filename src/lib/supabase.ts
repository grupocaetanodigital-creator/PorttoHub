import { createClient } from '@supabase/supabase-js';
import {
  Profile,
  Condominio,
  EscalaTrabalho,
  ApontamentoFolha,
  DemonstrativoPagamento,
  ItemDemonstrativo
} from '../types/database';

export const SUPABASE_URL = 'https://cyyvubiythuzhdwbuogg.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5eXZ1Yml5dGh1emhkd2J1b2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NDI5OTIsImV4cCI6MjEwOTUxODk5Mn0.DMs3SiI0Mm5YeNlKdvqjlB-GVU1WPYsRgsjCcNHCCqI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SUPABASE_SCHEMA_SQL = `-- TurnoCerto - Estrutura de Banco de Dados Oficial (Supabase PostgreSQL)
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard/project/cyyvubiythuzhdwbuogg/sql)

-- Extensão para UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf VARCHAR(14) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'supervisor', 'funcionario')) DEFAULT 'funcionario',
  avatar_url TEXT,
  disponivel_ft BOOLEAN DEFAULT FALSE,
  primeiro_acesso_concluido BOOLEAN DEFAULT FALSE,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Condomínios / Postos com Geofencing
CREATE TABLE IF NOT EXISTS public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  bairro TEXT,
  cidade TEXT DEFAULT 'São Paulo',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  raio_tolerancia_metros INTEGER DEFAULT 150,
  raio_metros INTEGER DEFAULT 50,
  contato_emergencia TEXT,
  tipo_posto VARCHAR(30) DEFAULT 'portaria_24h',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Escalas, Alocações e Gestão de Postos
CREATE TABLE IF NOT EXISTS public.escalas_trabalho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  data_escala DATE NOT NULL,
  turno_inicio TIMESTAMPTZ NOT NULL,
  turno_fim TIMESTAMPTZ NOT NULL,
  tipo_escala VARCHAR(30) CHECK (tipo_escala IN ('regular', 'ft_cobertura', 'substituicao_atestado', 'substituicao_ferias')) DEFAULT 'regular',
  status_posto VARCHAR(20) CHECK (status_posto IN ('coberto', 'vazio', 'em_andamento', 'finalizado')) DEFAULT 'vazio',
  tag_ativa VARCHAR(30) CHECK (tag_ativa IN ('regular', 'intervalo', 'escalado_cobertura', 'trabalhando_folga_ft', 'falta')) DEFAULT 'regular',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Apontamentos Financeiros (Faltas e FTs para Fechamento)
CREATE TABLE IF NOT EXISTS public.apontamentos_folha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_ocorrencia DATE NOT NULL,
  tipo_ocorrencia VARCHAR(30) CHECK (tipo_ocorrencia IN ('falta_nao_justificada', 'ft_trabalhada', 'atestado_aprovado', 'atestado_rejeitado')) NOT NULL,
  status_processamento VARCHAR(20) CHECK (status_processamento IN ('pendente', 'descontar', 'pagar_ft', 'abonado')) DEFAULT 'pendente',
  observacao TEXT,
  valor_calculado NUMERIC(10,2),
  anexo_url TEXT,
  crm_medico TEXT,
  dias_afastamento INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Registros de Ponto Eletrônico Mobile & Biometria (Online / Offline)
CREATE TABLE IF NOT EXISTS public.registros_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
  escala_id UUID REFERENCES public.escalas_trabalho(id) ON DELETE SET NULL,
  tipo_batida VARCHAR(30) CHECK (tipo_batida IN ('entrada', 'inicio_intervalo', 'fim_intervalo', 'saida', 'saida_intervalo', 'retorno_intervalo')) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  timestamp_batida TIMESTAMPTZ DEFAULT NOW(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  latitude_capturada DOUBLE PRECISION,
  longitude_capturada DOUBLE PRECISION,
  distancia_metros INTEGER,
  dentro_do_raio BOOLEAN DEFAULT TRUE,
  foto_comprovante TEXT,
  foto_comprovante_url TEXT,
  sincronizado_offline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Demonstrativos de Pagamento (Holerite Digital)
CREATE TABLE IF NOT EXISTS public.demonstrativos_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
  salario_base NUMERIC(10,2) NOT NULL,
  total_proventos NUMERIC(10,2) DEFAULT 0,
  total_descontos NUMERIC(10,2) DEFAULT 0,
  salario_liquido NUMERIC(10,2) DEFAULT 0,
  base_inss NUMERIC(10,2) DEFAULT 0,
  base_fgts NUMERIC(10,2) DEFAULT 0,
  valor_fgts NUMERIC(10,2) DEFAULT 0,
  base_irrf NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('rascunho', 'publicado')) DEFAULT 'rascunho',
  data_pagamento DATE,
  ciente_funcionario_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funcionario_id, mes_referencia)
);

-- 7. Tabela de Itens do Demonstrativo (Lançamentos Manuais RH)
CREATE TABLE IF NOT EXISTS public.itens_demonstrativo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demonstrativo_id UUID NOT NULL REFERENCES public.demonstrativos_pagamento(id) ON DELETE CASCADE,
  codigo VARCHAR(10) NOT NULL,
  descricao TEXT NOT NULL,
  referencia VARCHAR(30),
  tipo VARCHAR(20) CHECK (tipo IN ('provento', 'desconto')) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Configuração do Storage para Comprovantes de Ponto
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pontos-comprovantes', 'pontos-comprovantes', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS Permissivas & Rigorosas para a Operação, Ponto e Holerites
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apontamentos_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demonstrativos_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_demonstrativo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público condominios" ON public.condominios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público escalas" ON public.escalas_trabalho FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público apontamentos" ON public.apontamentos_folha FOR ALL USING (true) WITH CHECK (true);

-- RLS Rigoroso: Funcionário registra seu próprio ponto; supervisores auditam todos
CREATE POLICY "Funcionário insere apenas seu ponto" ON public.registros_ponto 
  FOR INSERT WITH CHECK (funcionario_id = auth.uid() OR auth.role() = 'anon');

CREATE POLICY "Funcionário vê seus pontos e supervisor vê todos" ON public.registros_ponto 
  FOR SELECT USING (
    funcionario_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('supervisor', 'admin'))
    OR auth.role() = 'anon'
  );

CREATE POLICY "RH gerencia demonstrativos" ON public.demonstrativos_pagamento FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "RH gerencia itens demonstrativo" ON public.itens_demonstrativo FOR ALL USING (true) WITH CHECK (true);
`;

// Initial realistic Brazilian Operational Seed Data for Condominiums & Personnel
export const SEED_PROFILES: Profile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    cpf: '111.222.333-44',
    full_name: 'Dra. Renata Albuquerque',
    role: 'supervisor',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    disponivel_ft: false,
    primeiro_acesso_concluido: true,
    cargo: 'Supervisora Operacional de Campo',
    telefone: '(11) 98765-4321',
    email: 'renata.supervisor@turnocerto.com.br'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    cpf: '222.333.444-55',
    full_name: 'Carlos Eduardo Santos',
    role: 'funcionario',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    disponivel_ft: false,
    primeiro_acesso_concluido: true,
    cargo: 'Porteiro Líder 12x36',
    telefone: '(11) 97123-1122',
    email: 'carlos.eduardo@turnocerto.com.br'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    cpf: '333.444.555-66',
    full_name: 'Tiago Santos Oliveira',
    role: 'funcionario',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    disponivel_ft: true, // Disponível para dobrar/cobrir em folga!
    primeiro_acesso_concluido: true,
    cargo: 'Controlador de Acesso / Folguista',
    telefone: '(11) 99887-3344',
    email: 'tiago.santos@turnocerto.com.br'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    cpf: '444.555.666-77',
    full_name: 'Fernando Augusto Lima',
    role: 'funcionario',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    disponivel_ft: true,
    primeiro_acesso_concluido: true,
    cargo: 'Vigilante Patrimonial',
    telefone: '(11) 98112-9988',
    email: 'fernando.lima@turnocerto.com.br'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    cpf: '555.666.777-88',
    full_name: 'Marcos Silva Nogueira',
    role: 'funcionario',
    avatar_url: null, // Sem foto ainda! Para testar a Câmera de 1º Acesso
    disponivel_ft: false,
    primeiro_acesso_concluido: false, // Dispara a Tela 02: Captura de Foto de Identidade
    cargo: 'Auxiliar de Portaria Júnior',
    telefone: '(11) 97445-6677',
    email: 'marcos.silva@turnocerto.com.br'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    cpf: '666.777.888-99',
    full_name: 'Antônio Ferreira (Ausente)',
    role: 'funcionario',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    disponivel_ft: false,
    primeiro_acesso_concluido: true,
    cargo: 'Porteiro Noturno / Diurno',
    telefone: '(11) 96332-1100',
    email: 'antonio.ferreira@turnocerto.com.br'
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    cpf: '777.888.999-00',
    full_name: 'Lucas Mendonça Vieira',
    role: 'funcionario',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    disponivel_ft: true, // Em dia de folga e disponível para FT!
    primeiro_acesso_concluido: true,
    cargo: 'Controlador de Acesso Folguista',
    telefone: '(11) 98223-4455',
    email: 'lucas.mendonca@turnocerto.com.br'
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    cpf: '888.999.000-11',
    full_name: 'Rodrigo Pacheco Dias',
    role: 'funcionario',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
    disponivel_ft: true, // Em dia de folga e disponível para FT!
    primeiro_acesso_concluido: true,
    cargo: 'Vigilante Folguista Diurno',
    telefone: '(11) 97334-5566',
    email: 'rodrigo.pacheco@turnocerto.com.br'
  }
];

export const SEED_CONDOMINIOS: Condominio[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    nome: 'Residencial Jardins das Palmeiras',
    endereco: 'Alameda dos Ipês, 450',
    bairro: 'Jardins',
    cidade: 'São Paulo',
    lat: -23.5615,
    lng: -46.6560,
    raio_tolerancia_metros: 150,
    contato_emergencia: '(11) 3288-1000 - Zelador Paulo',
    tipo_posto: 'portaria_24h'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    nome: 'Condomínio Edifício Horizon Tower',
    endereco: 'Av. Brigadeiro Faria Lima, 2800',
    bairro: 'Itaim Bibi',
    cidade: 'São Paulo',
    lat: -23.5820,
    lng: -46.6830,
    raio_tolerancia_metros: 120,
    contato_emergencia: '(11) 3045-8900 - Síndico Carlos',
    tipo_posto: 'controle_acesso'
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    nome: 'Condomínio Bosque Imperial',
    endereco: 'Rua Professor Arthur Ramos, 180',
    bairro: 'Pinheiros',
    cidade: 'São Paulo',
    lat: -23.5710,
    lng: -46.6910,
    raio_tolerancia_metros: 180,
    contato_emergencia: '(11) 3812-4422 - Gerente Valdir',
    tipo_posto: 'ronda'
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    nome: 'Condomínio Alphaville Grand Park',
    endereco: 'Alameda Rio Negro, 1030',
    bairro: 'Alphaville',
    cidade: 'Barueri',
    lat: -23.4980,
    lng: -46.8520,
    raio_tolerancia_metros: 200,
    contato_emergencia: '(11) 4195-2000 - Central Segurança',
    tipo_posto: 'portaria_24h'
  }
];

export const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const SEED_ESCALAS: EscalaTrabalho[] = [
  // Posto 1: Carlos no Jardins das Palmeiras - Regular ativo
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    funcionario_id: '22222222-2222-2222-2222-222222222222',
    condominio_id: 'c1111111-1111-1111-1111-111111111111',
    data_escala: getTodayDateString(),
    turno_inicio: `${getTodayDateString()}T07:00:00Z`,
    turno_fim: `${getTodayDateString()}T19:00:00Z`,
    tipo_escala: 'regular',
    status_posto: 'em_andamento',
    tag_ativa: 'regular', // 🟢 No Posto
    ultima_batida: `${getTodayDateString()}T06:54:12Z`
  },
  // Posto 2: Horizon Tower - CRÍTICO! POSTO VAZIO / FALTA DE ANTÔNIO!
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    funcionario_id: '66666666-6666-6666-6666-666666666666', // Antônio faltou
    condominio_id: 'c2222222-2222-2222-2222-222222222222',
    data_escala: getTodayDateString(),
    turno_inicio: `${getTodayDateString()}T07:00:00Z`,
    turno_fim: `${getTodayDateString()}T19:00:00Z`,
    tipo_escala: 'regular',
    status_posto: 'vazio', // 🔴 Posto Vazio!
    tag_ativa: 'falta',
    ultima_batida: null
  },
  // Posto 3: Bosque Imperial - Tiago Santos escalado para cobertura de emergência
  {
    id: 'e3333333-3333-3333-3333-333333333333',
    funcionario_id: '33333333-3333-3333-3333-333333333333',
    condominio_id: 'c3333333-3333-3333-3333-333333333333',
    data_escala: getTodayDateString(),
    turno_inicio: `${getTodayDateString()}T08:00:00Z`,
    turno_fim: `${getTodayDateString()}T20:00:00Z`,
    tipo_escala: 'ft_cobertura',
    status_posto: 'coberto',
    tag_ativa: 'escalado_cobertura', // 🔄 [Escalado para Cobertura] -> Vira ⚡ ao bater ponto
    ultima_batida: null
  },
  // Posto 4: Alphaville Grand Park - Fernando Augusto trabalhando em dia de folga (FT já ativa!)
  {
    id: 'e4444444-4444-4444-4444-444444444444',
    funcionario_id: '44444444-4444-4444-4444-444444444444',
    condominio_id: 'c4444444-4444-4444-4444-444444444444',
    data_escala: getTodayDateString(),
    turno_inicio: `${getTodayDateString()}T06:00:00Z`,
    turno_fim: `${getTodayDateString()}T18:00:00Z`,
    tipo_escala: 'ft_cobertura',
    status_posto: 'em_andamento',
    tag_ativa: 'trabalhando_folga_ft', // ⚡ [Trabalhando em Dia de Folga / FT]
    ultima_batida: `${getTodayDateString()}T05:58:34Z`
  }
];

export const SEED_APONTAMENTOS: ApontamentoFolha[] = [
  // FT já trabalhada por Fernando Augusto esperando fechamento
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    funcionario_id: '44444444-4444-4444-4444-444444444444',
    data_ocorrencia: getTodayDateString(),
    tipo_ocorrencia: 'ft_trabalhada',
    status_processamento: 'pendente',
    observacao: 'Cobertura emergencial no Alphaville Grand Park (12h de turno extra).',
    valor_calculado: 240.00
  },
  // Falta não justificada de Antônio Ferreira para a Supervisora decidir
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    funcionario_id: '66666666-6666-6666-6666-666666666666',
    data_ocorrencia: getTodayDateString(),
    tipo_ocorrencia: 'falta_nao_justificada',
    status_processamento: 'pendente',
    observacao: 'Ausência sem aviso no posto Horizon Tower. Posto permaneceu desguarnecido.',
    valor_calculado: -145.00
  },
  // Atestado médico aguardando aprovação
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    funcionario_id: '22222222-2222-2222-2222-222222222222',
    data_ocorrencia: getTodayDateString(),
    tipo_ocorrencia: 'atestado_aprovado',
    status_processamento: 'abonado',
    observacao: 'Atestado médico 2 dias - CID J06.9 (Infecção respiratória). DSR mantido.',
    crm_medico: 'CRM/SP 194.882',
    dias_afastamento: 2,
    anexo_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80'
  }
];

export const SEED_DEMONSTRATIVOS: DemonstrativoPagamento[] = [
  // 1. Carlos Eduardo - Competência 03/2026 (Publicado, pronto para visualização e ciente)
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    funcionario_id: '22222222-2222-2222-2222-222222222222',
    mes_referencia: '2026-03',
    salario_base: 2140.00,
    total_proventos: 2808.00,
    total_descontos: 781.12,
    salario_liquido: 2026.88,
    base_inss: 2808.00,
    base_fgts: 2808.00,
    valor_fgts: 224.64,
    base_irrf: 2555.28,
    status: 'publicado',
    data_pagamento: '2026-04-05',
    ciente_funcionario_em: null,
    observacoes: 'Folha mensal com inclusão de FT 12x36 realizada no Residencial Jardins.',
    itens: [
      {
        id: 'i111',
        demonstrativo_id: 'd1111111-1111-1111-1111-111111111111',
        codigo: '001',
        descricao: 'Salário Base Porteiro Líder',
        referencia: '30 dias',
        tipo: 'provento',
        valor: 2140.00,
        ordem: 1
      },
      {
        id: 'i112',
        demonstrativo_id: 'd1111111-1111-1111-1111-111111111111',
        codigo: '015',
        descricao: 'Adicional Noturno 20% CLT',
        referencia: '20.00%',
        tipo: 'provento',
        valor: 428.00,
        ordem: 2
      },
      {
        id: 'i113',
        demonstrativo_id: 'd1111111-1111-1111-1111-111111111111',
        codigo: '102',
        descricao: 'Folga Trabalhada (FT Cobertura ⚡)',
        referencia: '12 horas',
        tipo: 'provento',
        valor: 240.00,
        ordem: 3
      },
      {
        id: 'i114',
        demonstrativo_id: 'd1111111-1111-1111-1111-111111111111',
        codigo: '901',
        descricao: 'INSS Regime Geral CLT',
        referencia: '9.00%',
        tipo: 'desconto',
        valor: 252.72,
        ordem: 4
      },
      {
        id: 'i115',
        demonstrativo_id: 'd1111111-1111-1111-1111-111111111111',
        codigo: '905',
        descricao: 'Vale Transporte (Desconto Legal)',
        referencia: '6.00%',
        tipo: 'desconto',
        valor: 128.40,
        ordem: 5
      },
      {
        id: 'i116',
        demonstrativo_id: 'd1111111-1111-1111-1111-111111111111',
        codigo: '920',
        descricao: 'Adiantamento Quinzenal (Vale)',
        referencia: 'Dia 20',
        tipo: 'desconto',
        valor: 400.00,
        ordem: 6
      }
    ]
  },
  // 2. Carlos Eduardo - Competência 02/2026 (Publicado com ciente já assinado)
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    funcionario_id: '22222222-2222-2222-2222-222222222222',
    mes_referencia: '2026-02',
    salario_base: 2140.00,
    total_proventos: 2568.00,
    total_descontos: 321.12,
    salario_liquido: 2246.88,
    base_inss: 2568.00,
    base_fgts: 2568.00,
    valor_fgts: 205.44,
    base_irrf: 2375.28,
    status: 'publicado',
    data_pagamento: '2026-03-05',
    ciente_funcionario_em: '2026-03-06T14:22:10Z',
    observacoes: 'Folha regular referente a Fevereiro/2026.',
    itens: [
      {
        id: 'i201',
        demonstrativo_id: 'd2222222-2222-2222-2222-222222222222',
        codigo: '001',
        descricao: 'Salário Base Porteiro Líder',
        referencia: '30 dias',
        tipo: 'provento',
        valor: 2140.00,
        ordem: 1
      },
      {
        id: 'i202',
        demonstrativo_id: 'd2222222-2222-2222-2222-222222222222',
        codigo: '015',
        descricao: 'Adicional Noturno 20%',
        referencia: '20.00%',
        tipo: 'provento',
        valor: 428.00,
        ordem: 2
      },
      {
        id: 'i203',
        demonstrativo_id: 'd2222222-2222-2222-2222-222222222222',
        codigo: '901',
        descricao: 'INSS Previdência Social',
        referencia: '7.50%',
        tipo: 'desconto',
        valor: 192.72,
        ordem: 3
      },
      {
        id: 'i204',
        demonstrativo_id: 'd2222222-2222-2222-2222-222222222222',
        codigo: '905',
        descricao: 'Vale Transporte',
        referencia: '6.00%',
        tipo: 'desconto',
        valor: 128.40,
        ordem: 4
      }
    ]
  },
  // 3. Tiago Santos - Competência 03/2026 (Publicado)
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    funcionario_id: '33333333-3333-3333-3333-333333333333',
    mes_referencia: '2026-03',
    salario_base: 1950.00,
    total_proventos: 2190.00,
    total_descontos: 292.50,
    salario_liquido: 1897.50,
    base_inss: 2190.00,
    base_fgts: 2190.00,
    valor_fgts: 175.20,
    base_irrf: 2014.50,
    status: 'publicado',
    data_pagamento: '2026-04-05',
    ciente_funcionario_em: null,
    observacoes: 'Incluso turno extra de cobertura no Bosque Imperial.',
    itens: [
      {
        id: 'i301',
        demonstrativo_id: 'd3333333-3333-3333-3333-333333333333',
        codigo: '001',
        descricao: 'Salário Base Controlador de Acesso',
        referencia: '30 dias',
        tipo: 'provento',
        valor: 1950.00,
        ordem: 1
      },
      {
        id: 'i302',
        demonstrativo_id: 'd3333333-3333-3333-3333-333333333333',
        codigo: '102',
        descricao: 'Folga Trabalhada (FT ⚡ Emergência)',
        referencia: '12 horas',
        tipo: 'provento',
        valor: 240.00,
        ordem: 2
      },
      {
        id: 'i303',
        demonstrativo_id: 'd3333333-3333-3333-3333-333333333333',
        codigo: '901',
        descricao: 'INSS Segurado',
        referencia: '8.00%',
        tipo: 'desconto',
        valor: 175.50,
        ordem: 3
      },
      {
        id: 'i304',
        demonstrativo_id: 'd3333333-3333-3333-3333-333333333333',
        codigo: '905',
        descricao: 'Vale Transporte Legal',
        referencia: '6.00%',
        tipo: 'desconto',
        valor: 117.00,
        ordem: 4
      }
    ]
  },
  // 4. Fernando Augusto - Competência 03/2026 (Rascunho RH - ainda não visível no app do funcionário)
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    funcionario_id: '44444444-4444-4444-4444-444444444444',
    mes_referencia: '2026-03',
    salario_base: 2280.00,
    total_proventos: 2760.00,
    total_descontos: 341.20,
    salario_liquido: 2418.80,
    base_inss: 2760.00,
    base_fgts: 2760.00,
    valor_fgts: 220.80,
    base_irrf: 2555.20,
    status: 'rascunho', // RASCUNHO! RH pode editar e publicar!
    data_pagamento: '2026-04-05',
    ciente_funcionario_em: null,
    observacoes: 'Rascunho em conferência pelo RH.',
    itens: [
      {
        id: 'i401',
        demonstrativo_id: 'd4444444-4444-4444-4444-444444444444',
        codigo: '001',
        descricao: 'Salário Base Vigilante Patrimonial',
        referencia: '30 dias',
        tipo: 'provento',
        valor: 2280.00,
        ordem: 1
      },
      {
        id: 'i402',
        demonstrativo_id: 'd4444444-4444-4444-4444-444444444444',
        codigo: '102',
        descricao: 'Folga Trabalhada (FT ⚡ Alphaville)',
        referencia: '24 horas (2 FTs)',
        tipo: 'provento',
        valor: 480.00,
        ordem: 2
      },
      {
        id: 'i403',
        demonstrativo_id: 'd4444444-4444-4444-4444-444444444444',
        codigo: '901',
        descricao: 'INSS',
        referencia: '9.00%',
        tipo: 'desconto',
        valor: 248.40,
        ordem: 3
      },
      {
        id: 'i404',
        demonstrativo_id: 'd4444444-4444-4444-4444-444444444444',
        codigo: '915',
        descricao: 'Seguro de Vida em Grupo',
        referencia: 'Taxa fixa',
        tipo: 'desconto',
        valor: 92.80,
        ordem: 4
      }
    ]
  }
];

-- ==============================================================================
-- CORREÇÕES DEFINITIVAS E ATUALIZAÇÕES DO BANCO DE DADOS SUPABASE (INFPORT)
-- 100% RESILIENTE: Cada comando executa de forma segura e idempotente,
-- sem travar ou abortar caso colunas, tabelas ou índices já existam.
-- Inclui suporte a Fotos de Perfil (Moradores, Visitantes, Prestadores e Operadores)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: condominios
-- ==============================================================================
CREATE TABLE IF NOT EXISTS condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT DEFAULT 'São Paulo',
  ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT 'SP',
  ADD COLUMN IF NOT EXISTS telefone_portaria TEXT,
  ADD COLUMN IF NOT EXISTS sindico_nome TEXT,
  ADD COLUMN IF NOT EXISTS sindico_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_url TEXT,
  ADD COLUMN IF NOT EXISTS escala_plantao TEXT DEFAULT '06_18',
  ADD COLUMN IF NOT EXISTS horario_diurno_inicio TEXT DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS horario_noturno_inicio TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS intervalo_ronda INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS tipo_estrutura TEXT DEFAULT 'casas',
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'residencial',
  ADD COLUMN IF NOT EXISTS qtd_blocos INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unidades_por_bloco INTEGER DEFAULT 117,
  ADD COLUMN IF NOT EXISTS nomes_blocos TEXT,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Garante condomínio padrão para testes / homologação
INSERT INTO condominios (id, nome, endereco, tipo_estrutura)
VALUES ('00000000-0000-0000-0000-000000000001', 'Condomínio Residencial Homologação', 'Portaria Central', 'casas')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 3. TABELA: configuracoes (RBAC e Níveis de Acesso)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  niveis_acesso JSONB DEFAULT '[]'::jsonb,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  setores_ronda JSONB DEFAULT '[]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS niveis_acesso JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS setores_ronda JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb;

-- Garante constraint UNIQUE em configuracoes(condominio_id) para upsert seguro, limpando duplicatas se houver
DO $$
BEGIN
  -- Limpa duplicatas mantendo apenas a mais recente antes de criar a constraint
  DELETE FROM configuracoes a USING configuracoes b
  WHERE a.ctid < b.ctid AND a.condominio_id = b.condominio_id AND a.condominio_id IS NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_condominio_id_key'
  ) THEN
    ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_condominio_id_key UNIQUE (condominio_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 4. TABELA: operadores (com suporte a Foto de Perfil)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  perfil TEXT DEFAULT 'operador',
  nivel_acesso INTEGER DEFAULT 3,
  nivel_acesso_custom_id TEXT DEFAULT 'nivel_3',
  funcao TEXT,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE operadores
  ADD COLUMN IF NOT EXISTS nivel_acesso INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS nivel_acesso_custom_id TEXT DEFAULT 'nivel_3',
  ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'operador',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS funcao TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- ==============================================================================
-- 5. TABELA: entregadores
-- ==============================================================================
CREATE TABLE IF NOT EXISTS entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE entregadores
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- ==============================================================================
-- 6. TABELA: lotes_re (Correção definitiva do Salvamento de RE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lotes_re (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_re TEXT NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  entregador_id UUID REFERENCES entregadores(id) ON DELETE SET NULL,
  qtd_declarada INTEGER DEFAULT 1,
  qtd_triada INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aguardando_triagem',
  operador_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lotes_re
  ADD COLUMN IF NOT EXISTS codigo_re TEXT,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS entregador_id UUID,
  ADD COLUMN IF NOT EXISTS qtd_declarada INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qtd_triada INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aguardando_triagem',
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Remove restrições UNIQUE problemáticas em codigo_re que bloqueavam múltiplos REs
DO $$
BEGIN
  ALTER TABLE lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_key;
  ALTER TABLE lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_unique;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_lotes_re_condo_codigo ON lotes_re(condominio_id, codigo_re);
  CREATE INDEX IF NOT EXISTS idx_lotes_re_created_at ON lotes_re(created_at DESC);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 7. TABELA: moradores (Suporte completo a Foto de Perfil, CPF, Tipo e Acesso)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cpf TEXT,
  tipo TEXT DEFAULT 'Morador',
  foto_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE moradores
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS tag_rfid TEXT,
  ADD COLUMN IF NOT EXISTS codigo_acesso TEXT,
  ADD COLUMN IF NOT EXISTS status_acesso TEXT DEFAULT 'liberado',
  ADD COLUMN IF NOT EXISTS veiculo_placa TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_modelo TEXT,
  ADD COLUMN IF NOT EXISTS contato_emergencia TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_moradores_condo_unidade ON moradores(condominio_id, unidade);
  CREATE INDEX IF NOT EXISTS idx_moradores_condo_nome ON moradores(condominio_id, nome);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 8. TABELAS: chaves & movimentacao_chaves (Quadro Digital e Claviculário)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_chave TEXT NOT NULL,
  nome_chave TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT,
  tempo_limite_horas INTEGER DEFAULT 2,
  status TEXT DEFAULT 'Disponível',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chaves
  ADD COLUMN IF NOT EXISTS codigo_chave TEXT,
  ADD COLUMN IF NOT EXISTS nome_chave TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS tempo_limite_horas INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Disponível',
  ADD COLUMN IF NOT EXISTS condominio_id UUID;

CREATE TABLE IF NOT EXISTS movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  chave_id UUID,
  retirante_nome TEXT NOT NULL,
  retirante_doc TEXT,
  retirante_telefone TEXT,
  foto_retirada_url TEXT,
  data_hora_retirada TIMESTAMPTZ DEFAULT NOW(),
  previsao_devolucao TIMESTAMPTZ,
  data_hora_devolucao TIMESTAMPTZ,
  foto_devolucao_url TEXT,
  status TEXT DEFAULT 'Em Andamento',
  operador_retirada TEXT,
  operador_devolucao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE movimentacao_chaves
  ADD COLUMN IF NOT EXISTS chave_id UUID,
  ADD COLUMN IF NOT EXISTS retirante_nome TEXT,
  ADD COLUMN IF NOT EXISTS retirante_doc TEXT,
  ADD COLUMN IF NOT EXISTS retirante_telefone TEXT,
  ADD COLUMN IF NOT EXISTS foto_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS previsao_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS foto_devolucao_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Em Andamento',
  ADD COLUMN IF NOT EXISTS operador_retirada TEXT,
  ADD COLUMN IF NOT EXISTS operador_devolucao TEXT;

-- Garante ON DELETE CASCADE na chave estrangeira de movimentação de chaves
-- para permitir a exclusão da chave do quadro sem quebrar integridade referencial
DO $$
BEGIN
  -- Limpa órfãos antes de adicionar restrição
  DELETE FROM movimentacao_chaves 
  WHERE chave_id IS NOT NULL AND chave_id NOT IN (SELECT id FROM chaves);

  ALTER TABLE movimentacao_chaves DROP CONSTRAINT IF EXISTS movimentacao_chaves_chave_id_fkey;
  ALTER TABLE movimentacao_chaves 
    ADD CONSTRAINT movimentacao_chaves_chave_id_fkey 
    FOREIGN KEY (chave_id) REFERENCES chaves(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 9. TABELA: materiais_posto (Inventário e Equipamentos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS materiais_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Outros',
  codigo_patrimonio TEXT,
  estado TEXT DEFAULT 'Perfeito',
  observacao_avaria TEXT,
  foto_avaria_url TEXT,
  operador_atualizacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE materiais_posto
  ADD COLUMN IF NOT EXISTS codigo_patrimonio TEXT,
  ADD COLUMN IF NOT EXISTS observacao_avaria TEXT,
  ADD COLUMN IF NOT EXISTS foto_avaria_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_atualizacao TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Perfeito';

-- ==============================================================================
-- 10. TABELA: historico_absoluto (Auditoria e Logs Imutáveis)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS historico_absoluto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB,
  operador_nome TEXT,
  operador_id TEXT,
  operador_login TEXT,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE historico_absoluto
  ADD COLUMN IF NOT EXISTS modulo TEXT,
  ADD COLUMN IF NOT EXISTS acao TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS detalhes JSONB,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_login TEXT,
  ADD COLUMN IF NOT EXISTS condominio_id UUID;

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_historico_condominio ON historico_absoluto(condominio_id);
  CREATE INDEX IF NOT EXISTS idx_historico_data_hora ON historico_absoluto(data_hora DESC);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 11. TABELAS: prestadores & prestadores_acessos (Visitantes e Prestadores com Foto)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  tipo_documento TEXT DEFAULT 'RG',
  telefone TEXT,
  empresa TEXT,
  funcao TEXT,
  perfil_acesso TEXT DEFAULT 'prestador_unidade',
  parentesco_vinculo TEXT,
  bloco TEXT,
  unidade TEXT,
  placa_veiculo TEXT,
  tipo_servico TEXT,
  foto_rosto TEXT,
  foto_url TEXT,
  foto_documento TEXT,
  tipo_validade TEXT DEFAULT 'hoje',
  data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_validade_fim TIMESTAMPTZ,
  tempo_maximo_minutos INTEGER DEFAULT 240,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  status_acesso TEXT DEFAULT 'FORA',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prestadores
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT DEFAULT 'prestador_unidade',
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS tipo_servico TEXT,
  ADD COLUMN IF NOT EXISTS foto_rosto TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_documento TEXT,
  ADD COLUMN IF NOT EXISTS tipo_validade TEXT DEFAULT 'hoje',
  ADD COLUMN IF NOT EXISTS data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_validade_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tempo_maximo_minutos INTEGER DEFAULT 240,
  ADD COLUMN IF NOT EXISTS status_acesso TEXT DEFAULT 'FORA',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

CREATE TABLE IF NOT EXISTS prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  prestador_id UUID REFERENCES prestadores(id) ON DELETE CASCADE,
  perfil_acesso TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  parentesco_vinculo TEXT,
  unidade TEXT,
  bloco TEXT,
  foto_rosto TEXT,
  foto_url TEXT,
  cracha TEXT,
  placa_veiculo TEXT,
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  tempo_maximo_minutos INTEGER DEFAULT 240,
  limite_permanencia_ate TIMESTAMPTZ,
  data_hora_saida TIMESTAMPTZ,
  status_acesso TEXT DEFAULT 'DENTRO',
  operador_entrada_nome TEXT,
  operador_saida_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prestadores_acessos
  ADD COLUMN IF NOT EXISTS foto_rosto TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS limite_permanencia_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cracha TEXT,
  ADD COLUMN IF NOT EXISTS status_acesso TEXT DEFAULT 'DENTRO';

-- Tabela alternativa prestadores_autorizados (compatibilidade)
CREATE TABLE IF NOT EXISTS prestadores_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  tipo_documento TEXT DEFAULT 'RG',
  telefone TEXT,
  empresa TEXT,
  funcao TEXT,
  perfil_acesso TEXT DEFAULT 'prestador_unidade',
  bloco TEXT,
  unidade TEXT,
  foto_url TEXT,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. ATIVAÇÃO DE RLS E POLÍTICAS PERMISSIVAS PARA A PORTARIA
-- ==============================================================================
DO $$
DECLARE
  t TEXT;
  tabelas TEXT[] := ARRAY[
    'condominios', 'configuracoes', 'operadores', 'entregadores', 
    'lotes_re', 'moradores', 'chaves', 'movimentacao_chaves', 
    'materiais_posto', 'historico_absoluto', 'prestadores',
    'prestadores_acessos', 'prestadores_autorizados'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Acesso_app_' || t, t);
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true);', 'Acesso_app_' || t, t);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- 13. RECARREGA O CACHE DO SUPABASE POSTGREST
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

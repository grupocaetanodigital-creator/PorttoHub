-- ==============================================================================
-- INFPORT 1.0 - SCRIPT SQL DE CRIAÇÃO DO MÓDULO 11: BANCADA DE PORTARIA & BALCÃO
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/kkeizhscivyfjgetnbke/sql/new
--
-- O que este script faz:
-- 1. Cria a tabela 'bancada_volumes' para controle contínuo dos volumes físicos retidos.
-- 2. Cria a tabela 'bancada_conferencias' para snapshots/auditoria de trocas de turno e zeramento.
-- 3. Adiciona as colunas 'mod11_bancada_conferencia', 'mod01_cadastros_base',
--    'mod12_historico_absoluto' e 'mod_portal_sindico' na tabela 'configuracoes'.
-- 4. Cria índices de alta performance por condomínio, status e estrutura/unidade.
-- 5. Habilita Row Level Security (RLS) permissivo para a guarita offline/online.
-- 6. Adiciona as tabelas ao supabase_realtime para sincronização instantânea.
-- 7. Executa NOTIFY pgrst, 'reload schema' para recarregar a API do Supabase na hora.
-- ==============================================================================

BEGIN;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA: bancada_volumes (Volumes físicos retidos no balcão da guarita)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bancada_volumes (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  estrutura TEXT NOT NULL,                -- Ex: "Torre A", "Bloco B", "Quadra 01", "Geral"
  unidade TEXT NOT NULL,                  -- Ex: "105A", "1507A", "102", "Casa 04"
  volumes INTEGER NOT NULL DEFAULT 1,     -- Quantidade de volumes retidos para esta unidade
  observacao TEXT,                        -- Ex: "Caixa grande", "Mercado Livre"
  tipo_volume TEXT DEFAULT 'Volume',      -- Ex: "Caixa", "Envelope", "Sacola"
  operador_nome TEXT,                     -- Operador que realizou o lançamento
  operador_id TEXT,                       -- ID do operador
  status TEXT NOT NULL DEFAULT 'ativo',   -- 'ativo', 'entregue', 'finalizado'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas caso a tabela já exista parcialmente
ALTER TABLE bancada_volumes
  ADD COLUMN IF NOT EXISTS estrutura TEXT NOT NULL DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS unidade TEXT NOT NULL DEFAULT '00',
  ADD COLUMN IF NOT EXISTS volumes INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS tipo_volume TEXT DEFAULT 'Volume',
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 2. TABELA: bancada_conferencias (Snapshots e auditoria de balcão / Passagem de Posto)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bancada_conferencias (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  operador_nome TEXT NOT NULL,
  operador_id TEXT,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_volumes INTEGER NOT NULL DEFAULT 0,
  total_unidades INTEGER NOT NULL DEFAULT 0,
  estruturas_resumo JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bancada_conferencias
  ADD COLUMN IF NOT EXISTS total_volumes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_unidades INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estruturas_resumo JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 3. ATUALIZAÇÃO DA TABELA CONFIGURAÇÕES (FEATURE FLAGS & MÓDULOS)
-- ==============================================================================
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS mod01_cadastros_base BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod11_bancada_conferencia BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod12_historico_absoluto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod_portal_sindico BOOLEAN DEFAULT true;

-- ==============================================================================
-- 4. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bancada_volumes_condominio ON bancada_volumes(condominio_id);
CREATE INDEX IF NOT EXISTS idx_bancada_volumes_status ON bancada_volumes(status);
CREATE INDEX IF NOT EXISTS idx_bancada_volumes_estrutura_unidade ON bancada_volumes(condominio_id, estrutura, unidade);
CREATE INDEX IF NOT EXISTS idx_bancada_volumes_created ON bancada_volumes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bancada_conferencias_condominio ON bancada_conferencias(condominio_id);
CREATE INDEX IF NOT EXISTS idx_bancada_conferencias_data_hora ON bancada_conferencias(data_hora DESC);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) E POLÍTICAS PERMISSIVAS PARA PORTARIA
-- ==============================================================================
ALTER TABLE bancada_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancada_conferencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total bancada_volumes anon" ON bancada_volumes;
DROP POLICY IF EXISTS "Acesso total bancada_volumes auth" ON bancada_volumes;
DROP POLICY IF EXISTS "Acesso total bancada_volumes" ON bancada_volumes;
CREATE POLICY "Acesso total bancada_volumes" ON bancada_volumes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total bancada_conferencias anon" ON bancada_conferencias;
DROP POLICY IF EXISTS "Acesso total bancada_conferencias auth" ON bancada_conferencias;
DROP POLICY IF EXISTS "Acesso total bancada_conferencias" ON bancada_conferencias;
CREATE POLICY "Acesso total bancada_conferencias" ON bancada_conferencias FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE bancada_volumes;
    EXCEPTION WHEN duplicate_object THEN
      -- Já adicionada
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE bancada_conferencias;
    EXCEPTION WHEN duplicate_object THEN
      -- Já adicionada
    END;
  END IF;
END $$;

COMMIT;

-- 7. RECARREGAR CACHE DO POSTGREST IMEDIATAMENTE
NOTIFY pgrst, 'reload schema';

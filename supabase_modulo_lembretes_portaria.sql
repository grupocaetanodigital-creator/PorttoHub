-- ==============================================================================
-- INFPORT 1.0 - SCRIPT SQL DE CRIAÇÃO DO MÓDULO DE LEMBRETES E MENSAGENS (PORTARIA ⇄ MORADORES)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/kkeizhscivyfjgetnbke/sql/new
--
-- O que este script faz:
-- 1. Cria a tabela 'lembretes_portaria' para comunicação bidirecional e recados.
-- 2. Garante a coluna mandatória de isolamento multi-tenant 'condominio_id'.
-- 3. Cria índices de alta performance por condomínio, status de leitura e unidade.
-- 4. Habilita Row Level Security (RLS) permissivo para a guarita offline/online.
-- 5. Adiciona a tabela ao supabase_realtime para alerta sonoro e visual instantâneo.
-- 6. Executa NOTIFY pgrst, 'reload schema' para recarregar a API do Supabase na hora.
-- ==============================================================================

BEGIN;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DEDICADA: lembretes_portaria
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lembretes_portaria (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  unidade_bloco TEXT NOT NULL,                   -- Ex: "Apto 102 - Bloco B", "Bloco A - Apto 304"
  remetente_tipo TEXT NOT NULL DEFAULT 'morador',-- 'morador' ou 'portaria' (também aceita 'supervisao', 'sindico')
  remetente_nome TEXT,                           -- Nome do morador ou do operador/guarita
  mensagem TEXT NOT NULL,                        -- Texto completo do aviso ou instrução
  tipo TEXT NOT NULL DEFAULT 'Aviso Geral',      -- 'Palavra-chave', 'Instrução', 'Aviso Geral', 'Correspondência Urgente', 'Autorização'
  lido BOOLEAN NOT NULL DEFAULT FALSE,           -- Status booleano de leitura
  lido_em TIMESTAMPTZ,                           -- Data e hora em que foi marcado como ciente/lido
  lido_por_nome TEXT,                            -- Nome do operador que marcou como ciente
  lido_por_id TEXT,                              -- ID do operador
  created_at TIMESTAMPTZ DEFAULT NOW(),          -- Data e hora de criação
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas caso a tabela já tenha sido criada previamente com estrutura parcial
ALTER TABLE lembretes_portaria
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT NOT NULL DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS remetente_tipo TEXT NOT NULL DEFAULT 'morador',
  ADD COLUMN IF NOT EXISTS remetente_nome TEXT,
  ADD COLUMN IF NOT EXISTS mensagem TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Aviso Geral',
  ADD COLUMN IF NOT EXISTS lido BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lido_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS lido_por_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 2. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_lembretes_condominio ON lembretes_portaria(condominio_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_condominio_lido ON lembretes_portaria(condominio_id, lido, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lembretes_condominio_created ON lembretes_portaria(condominio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lembretes_unidade ON lembretes_portaria(condominio_id, unidade_bloco);
CREATE INDEX IF NOT EXISTS idx_lembretes_lido ON lembretes_portaria(lido);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ==============================================================================
ALTER TABLE lembretes_portaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total lembretes_portaria anon" ON lembretes_portaria;
DROP POLICY IF EXISTS "Acesso total lembretes_portaria auth" ON lembretes_portaria;
DROP POLICY IF EXISTS "Acesso total lembretes_portaria" ON lembretes_portaria;

CREATE POLICY "Acesso total lembretes_portaria" 
  ON lembretes_portaria 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 4. SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE lembretes_portaria;
    EXCEPTION WHEN duplicate_object THEN
      -- Tabela já registrada no publication
    END;
  END IF;
END $$;

COMMIT;

-- ==============================================================================
-- 5. RECARREGAR CACHE DO POSTGREST IMEDIATAMENTE
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

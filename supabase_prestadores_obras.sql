-- ==============================================================================
-- INFPORT 1.0 - ATUALIZAÇÃO DO MÓDULO DE PRESTADORES, AUTORIZADOS & OBRAS
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Garante colunas na tabela prestadores
ALTER TABLE prestadores
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT DEFAULT 'prestador_unidade',
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS tipo_validade TEXT DEFAULT 'hoje',
  ADD COLUMN IF NOT EXISTS data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_validade_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tempo_maximo_minutos INTEGER DEFAULT 240,
  ADD COLUMN IF NOT EXISTS limite_permanencia_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operador_entrada_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida_nome TEXT;

-- 2. Tabela de Histórico de Entradas & Saídas (permanência e crachá)
CREATE TABLE IF NOT EXISTS prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_prestadores_condominio ON prestadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_perfil ON prestadores(perfil_acesso);
CREATE INDEX IF NOT EXISTS idx_prestadores_status ON prestadores(status_acesso);
CREATE INDEX IF NOT EXISTS idx_prestadores_acessos_condominio ON prestadores_acessos(condominio_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_acessos_status ON prestadores_acessos(status_acesso);

-- Habilitar RLS e Políticas
ALTER TABLE prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestadores_acessos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prestadores' AND policyname = 'Permitir tudo prestadores') THEN
    CREATE POLICY "Permitir tudo prestadores" ON prestadores FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prestadores_acessos' AND policyname = 'Permitir tudo prestadores_acessos') THEN
    CREATE POLICY "Permitir tudo prestadores_acessos" ON prestadores_acessos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

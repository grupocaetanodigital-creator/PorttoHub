-- ==============================================================================
-- PorttoHub 1.0 — Migration SQL Oficial de Alta Performance
-- ARQUITETURA LOCAL-FIRST, DELTA SYNC, ÍNDICES COBRIDORES E SUPABASE CONNECTION POOLER
-- ==============================================================================
-- 
-- OBJETIVOS:
-- 1. Suporte nativo a Delta Sync: Índices compostos em (condominio_id, updated_at DESC).
-- 2. Covering Indexes (Índices Cobridores com INCLUDE): Elimina table scans no PostgreSQL.
-- 3. Resolução de Concorrência: Gatilhos automáticos para manutenção estrita de updated_at = NOW().
-- 4. Supabase Realtime: Configuração de Replica Identity Full e publicação CDC multi-tenant.
-- 5. Otimização PgBouncer / Supavisor: Prevenção de estouro de conexão em ambientes serverless (Vercel).
-- ==============================================================================

-- 1. FUNÇÃO E GATILHO UNIVERSAL PARA MANTER UPDATED_AT AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CLOCK_TIMESTAMP();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. GARANTIA DE COLUNAS E TRIGGERS PARA TABELAS CENTRAIS
-- ------------------------------------------------------------------------------

-- 2.1. ENCOMENDAS ITENS
ALTER TABLE public.encomendas_itens 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP(),
  ADD COLUMN IF NOT EXISTS transportadora TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_nome TEXT,
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT;

DROP TRIGGER IF EXISTS trg_encomendas_itens_updated_at ON public.encomendas_itens;
CREATE TRIGGER trg_encomendas_itens_updated_at
  BEFORE UPDATE ON public.encomendas_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at();

-- 2.2. CUSTÓDIA
ALTER TABLE public.custodia 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP();

DROP TRIGGER IF EXISTS trg_custodia_updated_at ON public.custodia;
CREATE TRIGGER trg_custodia_updated_at
  BEFORE UPDATE ON public.custodia
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at();

-- 2.3. MORADORES
ALTER TABLE public.moradores 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP();

DROP TRIGGER IF EXISTS trg_moradores_updated_at ON public.moradores;
CREATE TRIGGER trg_moradores_updated_at
  BEFORE UPDATE ON public.moradores
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at();

-- 2.4. BANCADA VOLUMES
ALTER TABLE public.bancada_volumes 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP();

DROP TRIGGER IF EXISTS trg_bancada_volumes_updated_at ON public.bancada_volumes;
CREATE TRIGGER trg_bancada_volumes_updated_at
  BEFORE UPDATE ON public.bancada_volumes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at();

-- 2.5. CHAVES / CLAVICULÁRIO
ALTER TABLE public.chaves 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP();

DROP TRIGGER IF EXISTS trg_chaves_updated_at ON public.chaves;
CREATE TRIGGER trg_chaves_updated_at
  BEFORE UPDATE ON public.chaves
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at();

-- 2.6. REGISTROS DE ACESSO
ALTER TABLE public.registros_acesso 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP();

DROP TRIGGER IF EXISTS trg_registros_acesso_updated_at ON public.registros_acesso;
CREATE TRIGGER trg_registros_acesso_updated_at
  BEFORE UPDATE ON public.registros_acesso
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at();

-- 2.7. LOTES RE
ALTER TABLE public.lotes_re 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP();

DROP TRIGGER IF EXISTS trg_lotes_re_updated_at ON public.lotes_re;
CREATE TRIGGER trg_lotes_re_updated_at
  BEFORE UPDATE ON public.lotes_re
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_porttohub_atualizar_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES COMPOSTOS E COBRIDORES (COVERING INDEXES) PARA DELTA SYNC
-- ------------------------------------------------------------------------------

-- 3.1. Encomendas: Busca rápida por status do tenant e verificação em milissegundos por updated_at
CREATE INDEX IF NOT EXISTS idx_encomendas_tenant_status 
  ON public.encomendas_itens (condominio_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_encomendas_tenant_updated_delta 
  ON public.encomendas_itens (condominio_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_encomendas_tenant_created_delta 
  ON public.encomendas_itens (condominio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_encomendas_tenant_unidade_bloco 
  ON public.encomendas_itens (condominio_id, unidade, bloco);

-- Índice cobridor para Delta Sync de Encomendas: Index Only Scan
CREATE INDEX IF NOT EXISTS idx_encomendas_delta_covering
  ON public.encomendas_itens (condominio_id, updated_at, created_at)
  INCLUDE (status, codigo_rastreio, codigo_barras, destinatario, unidade, bloco);

-- 3.2. Custódia: Busca de pendências e delta sync
CREATE INDEX IF NOT EXISTS idx_custodia_tenant_status 
  ON public.custodia (condominio_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custodia_tenant_updated_delta 
  ON public.custodia (condominio_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_custodia_tenant_created_delta 
  ON public.custodia (condominio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custodia_delta_covering
  ON public.custodia (condominio_id, updated_at, created_at)
  INCLUDE (status, codigo_custodia, descricao, origem_unidade, destino_unidade);

-- 3.3. Moradores e Veículos
CREATE INDEX IF NOT EXISTS idx_moradores_tenant_unidade 
  ON public.moradores (condominio_id, unidade, bloco);

CREATE INDEX IF NOT EXISTS idx_moradores_tenant_updated_delta 
  ON public.moradores (condominio_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_moradores_tenant_veiculo_placa 
  ON public.moradores (condominio_id, veiculo_placa)
  WHERE veiculo_placa IS NOT NULL;

-- 3.4. Bancada de Volumes
CREATE INDEX IF NOT EXISTS idx_bancada_tenant_status 
  ON public.bancada_volumes (condominio_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bancada_tenant_updated_delta 
  ON public.bancada_volumes (condominio_id, updated_at DESC);

-- 3.5. Chaves / Claviculário
CREATE INDEX IF NOT EXISTS idx_chaves_tenant_numero 
  ON public.chaves (condominio_id, numero);

CREATE INDEX IF NOT EXISTS idx_chaves_tenant_updated_delta 
  ON public.chaves (condominio_id, updated_at DESC);

-- 3.6. Registros de Acesso Portaria
CREATE INDEX IF NOT EXISTS idx_registros_acesso_tenant_data 
  ON public.registros_acesso (condominio_id, data_hora_entrada DESC);

CREATE INDEX IF NOT EXISTS idx_registros_acesso_tenant_status 
  ON public.registros_acesso (condominio_id, status, data_hora_entrada DESC);

CREATE INDEX IF NOT EXISTS idx_registros_acesso_tenant_updated_delta 
  ON public.registros_acesso (condominio_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_registros_acesso_tenant_placa 
  ON public.registros_acesso (condominio_id, veiculo_placa)
  WHERE veiculo_placa IS NOT NULL;

-- 3.7. Lotes RE (Recebimento de Entregadores)
CREATE INDEX IF NOT EXISTS idx_lotes_re_tenant_status 
  ON public.lotes_re (condominio_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lotes_re_tenant_updated_delta 
  ON public.lotes_re (condominio_id, updated_at DESC);

-- ------------------------------------------------------------------------------
-- 4. CONFIGURAÇÃO DE REALTIME WEBSOCKETS (CDC / SUPABASE CHANNELS)
-- ------------------------------------------------------------------------------
-- Garante que UPDATEs e DELETEs contenham todas as informações necessárias no payload WebSocket

ALTER TABLE public.encomendas_itens REPLICA IDENTITY FULL;
ALTER TABLE public.custodia REPLICA IDENTITY FULL;
ALTER TABLE public.moradores REPLICA IDENTITY FULL;
ALTER TABLE public.bancada_volumes REPLICA IDENTITY FULL;
ALTER TABLE public.chaves REPLICA IDENTITY FULL;
ALTER TABLE public.registros_acesso REPLICA IDENTITY FULL;

-- Adiciona as tabelas centrais na publicação de Realtime oficial
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.encomendas_itens,
      public.custodia,
      public.moradores,
      public.bancada_volumes,
      public.chaves,
      public.registros_acesso;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Tabelas já presentes na publicação supabase_realtime.';
    WHEN undefined_object THEN
      RAISE NOTICE 'Publicação supabase_realtime não encontrada neste schema local.';
  END;
END $$;

-- ------------------------------------------------------------------------------
-- 5. RECOMENDAÇÃO ARQUITETURAL: CONNECTION POOLER (PG Bouncer / Supavisor na Vercel)
-- ------------------------------------------------------------------------------
-- Na Vercel (Edge Functions / Serverless Lambdas), NUNCA conecte diretamente na porta 5432!
-- Conexões na porta 5432 são do tipo Session e esgotam o limite (~60 conexões) instantaneamente,
-- causando o erro "FATAL: remaining connection slots are reserved for non-replication superuser connections".
--
-- UTILIZE SEMPRE O SUPABASE TRANSACTION CONNECTION POOLER (Supavisor / PgBouncer):
-- Host: aws-0-[regiao].pooler.supabase.com
-- Porta: 6543 (Modo Transação)
-- Flag: ?pgbouncer=true
-- Exemplo de String de Conexão na Vercel:
-- DATABASE_URL="postgresql://postgres.[SEU_PROJECT_REF]:[SUA_SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
-- ==============================================================================

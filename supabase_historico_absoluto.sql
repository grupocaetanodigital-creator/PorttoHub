-- ==============================================================================
-- INFPORT 1.0 - SCRIPT EXCLUSIVO: TABELA DE HISTÓRICO ABSOLUTO & AUDITORIA
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/juafrepntyksggqiqzyes/sql/new
--
-- O que este script faz:
-- 1. Cria a tabela 'historico_absoluto' com chave primária UUID automática.
-- 2. Cria índices de busca otimizados por data, condomínio, módulo, ação e operador.
-- 3. Habilita Row Level Security (RLS) permissivo para a chave anon/service_role.
-- 4. Adiciona a tabela na publicação 'supabase_realtime' para atualização instantânea.
-- 5. Notifica o PostgREST para recarregar o schema cache imediatamente.
-- ==============================================================================

BEGIN;

-- 1. Criação da tabela de auditoria
CREATE TABLE IF NOT EXISTS public.historico_absoluto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  operador_id UUID,
  operador_nome TEXT NOT NULL,
  operador_login TEXT,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  ip TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para acelerar filtros e consultas do painel
CREATE INDEX IF NOT EXISTS idx_hist_abs_condominio ON public.historico_absoluto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_hist_abs_modulo ON public.historico_absoluto(modulo);
CREATE INDEX IF NOT EXISTS idx_hist_abs_acao ON public.historico_absoluto(acao);
CREATE INDEX IF NOT EXISTS idx_hist_abs_operador ON public.historico_absoluto(operador_id);
CREATE INDEX IF NOT EXISTS idx_hist_abs_criado_em ON public.historico_absoluto(criado_em DESC);

-- 3. Habilitação de Segurança (Row Level Security)
ALTER TABLE public.historico_absoluto ENABLE ROW LEVEL SECURITY;

-- 4. Política de Acesso Total para os operadores da portaria
DROP POLICY IF EXISTS "Acesso total portaria historico_absoluto" ON public.historico_absoluto;
CREATE POLICY "Acesso total portaria historico_absoluto" 
  ON public.historico_absoluto 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 5. Habilitação de Realtime no Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'historico_absoluto'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_absoluto;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Publicação supabase_realtime já configurada ou ignorada.';
END $$;

COMMIT;

-- 6. Recarregar o cache do schema no PostgREST
NOTIFY pgrst, 'reload schema';

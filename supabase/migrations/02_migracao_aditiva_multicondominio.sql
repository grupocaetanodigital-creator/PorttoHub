-- ============================================================================
-- PORTTOHUB — FASE B: MIGRAÇÃO ADITIVA MULTI-CONDOMÍNIO (ZERO QUEBRA)
-- ============================================================================
-- Regras de segurança:
-- - NÃO executa DROP TABLE, DROP COLUMN, TRUNCATE ou DELETE.
-- - NÃO altera políticas RLS atuais nesta fase (mantém app operando 100%).
-- - Prepara schema aditivo: auth_user_id, operador_condominios, admin_globais,
--   funções auxiliares SECURITY DEFINER, índices e triggers de integridade.
-- ============================================================================

BEGIN;

-- 1. Colunas aditivas em public.operadores para vínculo real com Supabase Auth
ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS e_super_admin_global BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id
  ON public.operadores(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operadores_email
  ON public.operadores(lower(email))
  WHERE email IS NOT NULL;

-- 2. Tabela explícita e auditável de Administradores Globais
CREATE TABLE IF NOT EXISTS public.admin_globais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID UNIQUE REFERENCES public.operadores(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_globais_auth_user
  ON public.admin_globais(auth_user_id)
  WHERE ativo = true;

-- 3. Tabela explícita de vínculo N:N Operador <-> Condomínio
CREATE TABLE IF NOT EXISTS public.operador_condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  papel TEXT DEFAULT 'operador',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operador_id, condominio_id)
);

CREATE INDEX IF NOT EXISTS idx_operador_condominios_lookup
  ON public.operador_condominios(operador_id, condominio_id)
  WHERE ativo = true;

-- 4. Backfill idempotente de operador_condominios a partir de operadores.condominio_id
INSERT INTO public.operador_condominios (operador_id, condominio_id, papel, ativo)
SELECT
  o.id,
  o.condominio_id,
  COALESCE(NULLIF(trim(o.perfil), ''), 'operador'),
  COALESCE(o.ativo, true)
FROM public.operadores o
JOIN public.condominios c ON c.id = o.condominio_id
WHERE o.condominio_id IS NOT NULL
ON CONFLICT (operador_id, condominio_id) DO NOTHING;

-- 5. Garantir coluna condominio_id e índice em todas as tabelas de domínio
DO $$
DECLARE
  tbl TEXT;
  tabelas TEXT[] := ARRAY[
    'moradores', 'entregadores', 'lotes_re', 'encomendas_itens',
    'locais_armazenamento', 'configuracoes', 'custodia', 'chaves',
    'movimentacao_chaves', 'rondas_setores', 'rondas_pontos', 'rondas_execucao',
    'rondas_registros', 'prestadores', 'prestadores_acessos', 'ocorrencias',
    'chamados_manutencao', 'checklist_manutencao', 'passagens_posto',
    'materiais_posto', 'historico_absoluto', 'lembretes', 'bancada_volumes',
    'bancada_conferencias', 'areas_comuns', 'reservas_areas_comuns',
    'pontos_acesso', 'registros_acesso', 'blacklist_bloqueios', 'passes_virtuais_qr'
  ];
  existe BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY tabelas LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) INTO existe;

    IF existe THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS condominio_id UUID', tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_condominio_id ON public.%I(condominio_id)', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- 6. Índices compostos úteis em encomendas e moradores
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_condo_status
  ON public.encomendas_itens(condominio_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_encomendas_itens_condo_morador
  ON public.encomendas_itens(condominio_id, morador_id);

CREATE INDEX IF NOT EXISTS idx_moradores_condo_unidade_bloco
  ON public.moradores(condominio_id, unidade, bloco);

-- 7. Funções auxiliares de autorização baseadas em auth.uid() (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.auth_operador_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.operadores o
  WHERE o.auth_user_id = auth.uid()
    AND COALESCE(o.ativo, true) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_globais ag
    WHERE ag.ativo = true
      AND (
        ag.auth_user_id = auth.uid()
        OR ag.operador_id = public.auth_operador_id()
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.operadores o
    WHERE o.auth_user_id = auth.uid()
      AND COALESCE(o.ativo, true) = true
      AND o.condominio_id IS NULL
      AND COALESCE(o.nivel_acesso, 99) = 0
      AND COALESCE(o.e_super_admin_global, false) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_has_condo_access(target_condo_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_condo_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      public.auth_is_global_admin()
      OR EXISTS (
        SELECT 1
        FROM public.operadores o
        WHERE o.auth_user_id = auth.uid()
          AND COALESCE(o.ativo, true) = true
          AND o.condominio_id = target_condo_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.operador_condominios oc
        JOIN public.operadores o ON o.id = oc.operador_id
        WHERE o.auth_user_id = auth.uid()
          AND COALESCE(o.ativo, true) = true
          AND oc.ativo = true
          AND oc.condominio_id = target_condo_id
      )
    );
$$;

-- 8. Triggers de integridade referencial cross-tenant em encomendas_itens
CREATE OR REPLACE FUNCTION public.fn_validar_integridade_condominio_encomenda()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_morador_condo UUID;
  v_lote_condo UUID;
BEGIN
  IF NEW.condominio_id IS NULL THEN
    RAISE EXCEPTION 'condominio_id é obrigatório em encomendas_itens.';
  END IF;

  IF NEW.morador_id IS NOT NULL THEN
    SELECT m.condominio_id INTO v_morador_condo
    FROM public.moradores m
    WHERE m.id = NEW.morador_id;

    IF v_morador_condo IS NOT NULL AND v_morador_condo <> NEW.condominio_id THEN
      RAISE EXCEPTION 'Violação Multi-Tenant: morador_id (%) pertence ao condomínio % e não ao condomínio %.',
        NEW.morador_id, v_morador_condo, NEW.condominio_id;
    END IF;
  END IF;

  IF NEW.lote_re_id IS NOT NULL THEN
    SELECT l.condominio_id INTO v_lote_condo
    FROM public.lotes_re l
    WHERE l.id = NEW.lote_re_id;

    IF v_lote_condo IS NOT NULL AND v_lote_condo <> NEW.condominio_id THEN
      RAISE EXCEPTION 'Violação Multi-Tenant: lote_re_id (%) pertence ao condomínio % e não ao condomínio %.',
        NEW.lote_re_id, v_lote_condo, NEW.condominio_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_integridade_condominio_encomenda ON public.encomendas_itens;
CREATE TRIGGER trg_validar_integridade_condominio_encomenda
  BEFORE INSERT OR UPDATE ON public.encomendas_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_integridade_condominio_encomenda();

-- 9. Trigger de imutabilidade de condominio_id em UPDATEs operacionais
CREATE OR REPLACE FUNCTION public.fn_prevenir_troca_condominio_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.condominio_id IS NOT NULL
     AND NEW.condominio_id IS DISTINCT FROM OLD.condominio_id
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND NOT public.auth_is_global_admin() THEN
    RAISE EXCEPTION 'Alteração de condominio_id bloqueada por política de isolamento multi-tenant.';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';

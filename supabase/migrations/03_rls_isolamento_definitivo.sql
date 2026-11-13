-- ============================================================================
-- PORTTOHUB — FASE D: ATIVAÇÃO DEFINITIVA DE RLS E STORAGE PRIVADO
-- ============================================================================
-- PRÉ-REQUISITO OBRIGATÓRIO (FASE C):
-- 1. Executar 01_auditoria_somente_leitura.sql e confirmar zero nulos/órfãos.
-- 2. Executar 02_migracao_aditiva_multicondominio.sql.
-- 3. Vincular todos os operadores ativos a contas Supabase Auth (`auth_user_id`),
--    popular `admin_globais` e validar `operador_condominios`.
-- 4. Migrar/copiar objetos legados no bucket `encomendas` para o prefixo
--    `condominios/<condominio_id>/...` antes de tornar o bucket privado.
-- ============================================================================

BEGIN;

-- Trava de segurança: aborta se houver operador ativo sem auth_user_id vinculado
DO $$
DECLARE
  qtd_sem_auth BIGINT;
BEGIN
  SELECT COUNT(*) INTO qtd_sem_auth
  FROM public.operadores
  WHERE COALESCE(ativo, true) = true
    AND auth_user_id IS NULL;

  IF qtd_sem_auth > 0 THEN
    RAISE EXCEPTION
      'ABORTADO (Proteção Anti-Bloqueio): Existem % operador(es) ativo(s) sem auth_user_id. Conclua a Fase C antes de ativar o RLS definitivo.',
      qtd_sem_auth;
  END IF;
END $$;

-- 1. Condomínios: SELECT restrito aos condomínios autorizados; escrita apenas Admin Global
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'condominios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.condominios', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "condominios_select_autorizados"
  ON public.condominios FOR SELECT TO authenticated
  USING (public.auth_has_condo_access(id));

CREATE POLICY "condominios_insert_global_admin"
  ON public.condominios FOR INSERT TO authenticated
  WITH CHECK (public.auth_is_global_admin());

CREATE POLICY "condominios_update_autorizados"
  ON public.condominios FOR UPDATE TO authenticated
  USING (public.auth_has_condo_access(id))
  WITH CHECK (public.auth_has_condo_access(id));

CREATE POLICY "condominios_delete_global_admin"
  ON public.condominios FOR DELETE TO authenticated
  USING (public.auth_is_global_admin());

-- 2. admin_globais e operador_condominios
ALTER TABLE public.admin_globais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operador_condominios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_globais_select" ON public.admin_globais;
CREATE POLICY "admin_globais_select"
  ON public.admin_globais FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.auth_is_global_admin());

DROP POLICY IF EXISTS "admin_globais_manage" ON public.admin_globais;
CREATE POLICY "admin_globais_manage"
  ON public.admin_globais FOR ALL TO authenticated
  USING (public.auth_is_global_admin())
  WITH CHECK (public.auth_is_global_admin());

DROP POLICY IF EXISTS "operador_condominios_select" ON public.operador_condominios;
CREATE POLICY "operador_condominios_select"
  ON public.operador_condominios FOR SELECT TO authenticated
  USING (
    operador_id = public.auth_operador_id()
    OR public.auth_has_condo_access(condominio_id)
  );

DROP POLICY IF EXISTS "operador_condominios_write" ON public.operador_condominios;
CREATE POLICY "operador_condominios_write"
  ON public.operador_condominios FOR ALL TO authenticated
  USING (public.auth_has_condo_access(condominio_id))
  WITH CHECK (public.auth_has_condo_access(condominio_id));

-- 3. Operadores: vê apenas o próprio perfil ou operadores dos condomínios autorizados
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'operadores'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.operadores', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "operadores_select_tenant"
  ON public.operadores FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.auth_is_global_admin()
    OR (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))
  );

CREATE POLICY "operadores_insert_tenant"
  ON public.operadores FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_global_admin()
    OR (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))
  );

CREATE POLICY "operadores_update_tenant"
  ON public.operadores FOR UPDATE TO authenticated
  USING (
    public.auth_is_global_admin()
    OR (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))
  )
  WITH CHECK (
    public.auth_is_global_admin()
    OR (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))
  );

CREATE POLICY "operadores_delete_tenant"
  ON public.operadores FOR DELETE TO authenticated
  USING (
    public.auth_is_global_admin()
    OR (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))
  );

-- 4. Todas as demais tabelas de domínio isoladas por condominio_id
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
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY tabelas LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) INTO existe;

    IF NOT existe THEN
      CONTINUE;
    END IF;

    -- Remove todas as policies legadas (incluindo Acesso_total_* e USING(true))
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))',
      'rls_' || tbl || '_select', tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))',
      'rls_' || tbl || '_insert', tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id)) WITH CHECK (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))',
      'rls_' || tbl || '_update', tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (condominio_id IS NOT NULL AND public.auth_has_condo_access(condominio_id))',
      'rls_' || tbl || '_delete', tbl
    );

    -- Trigger de imutabilidade de condominio_id
    EXECUTE format('DROP TRIGGER IF EXISTS trg_imutable_condo_%s ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_imutable_condo_%s BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_prevenir_troca_condominio_id()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- 5. Storage Privado e Isolado por Prefixo `condominios/<condominio_id>/...`
UPDATE storage.buckets
SET public = false
WHERE id = 'encomendas';

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%encomenda%'
        OR policyname ILIKE '%public%'
        OR policyname ILIKE '%porttohub%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "storage_encomendas_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'encomendas'
    AND (storage.foldername(name))[1] = 'condominios'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    AND public.auth_has_condo_access(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "storage_encomendas_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'encomendas'
    AND (storage.foldername(name))[1] = 'condominios'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    AND public.auth_has_condo_access(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "storage_encomendas_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'encomendas'
    AND (storage.foldername(name))[1] = 'condominios'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    AND public.auth_has_condo_access(((storage.foldername(name))[2])::uuid)
  )
  WITH CHECK (
    bucket_id = 'encomendas'
    AND (storage.foldername(name))[1] = 'condominios'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    AND public.auth_has_condo_access(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "storage_encomendas_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'encomendas'
    AND (storage.foldername(name))[1] = 'condominios'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    AND public.auth_has_condo_access(((storage.foldername(name))[2])::uuid)
  );

COMMIT;
NOTIFY pgrst, 'reload schema';

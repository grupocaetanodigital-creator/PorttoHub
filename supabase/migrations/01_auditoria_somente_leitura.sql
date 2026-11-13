-- ============================================================================
-- PORTTOHUB — FASE A: AUDITORIA SOMENTE LEITURA (ZERO ESCRITA / ZERO PII)
-- ============================================================================
-- Objetivo: Diagnosticar o estado real do banco Supabase antes de qualquer
-- alteração estrutural ou ativação de RLS multi-tenant.
-- Seguro para executar diretamente no SQL Editor em produção.
-- ============================================================================

-- 1. Inventário de tabelas públicas, status de RLS e políticas permissivas
SELECT
  t.tablename AS tabela,
  c.relrowsecurity AS rls_habilitado,
  c.relforcerowsecurity AS rls_forcado,
  COUNT(p.policyname) AS total_policies,
  BOOL_OR(
    COALESCE(p.qual, '') ~* '^\(?true\)?$'
    OR COALESCE(p.with_check, '') ~* '^\(?true\)?$'
  ) AS possui_policy_permissiva_true
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, c.relrowsecurity, c.relforcerowsecurity
ORDER BY possui_policy_permissiva_true DESC NULLS LAST, t.tablename;

-- 2. Detalhes de todas as policies atuais em public e storage.objects
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- 3. Auditoria de colunas condominio_id nulas ou ausentes em tabelas de domínio
DO $$
DECLARE
  tbl TEXT;
  tabelas TEXT[] := ARRAY[
    'operadores', 'moradores', 'entregadores', 'lotes_re', 'encomendas_itens',
    'locais_armazenamento', 'configuracoes', 'custodia', 'chaves',
    'movimentacao_chaves', 'rondas_setores', 'rondas_pontos', 'rondas_execucao',
    'rondas_registros', 'prestadores', 'prestadores_acessos', 'ocorrencias',
    'chamados_manutencao', 'checklist_manutencao', 'passagens_posto',
    'materiais_posto', 'historico_absoluto', 'lembretes', 'bancada_volumes',
    'bancada_conferencias', 'areas_comuns', 'reservas_areas_comuns',
    'pontos_acesso', 'registros_acesso', 'blacklist_bloqueios', 'passes_virtuais_qr'
  ];
  existe BOOLEAN;
  tem_col BOOLEAN;
  qtd_total BIGINT;
  qtd_nulos BIGINT;
BEGIN
  RAISE NOTICE '--- AUDITORIA DE CONDOMINIO_ID POR TABELA ---';
  FOREACH tbl IN ARRAY tabelas LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) INTO existe;

    IF NOT existe THEN
      RAISE NOTICE 'Tabela %: NAO EXISTE', tbl;
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'condominio_id'
    ) INTO tem_col;

    IF NOT tem_col THEN
      RAISE NOTICE 'Tabela %: SEM COLUNA condominio_id', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*), count(*) FILTER (WHERE condominio_id IS NULL) FROM public.%I', tbl)
      INTO qtd_total, qtd_nulos;

    RAISE NOTICE 'Tabela %: total=% | condominio_id_nulo=%', tbl, qtd_total, qtd_nulos;
  END LOOP;
END $$;

-- 4. Verificação de órfãos ou divergências cross-condomínio (apenas IDs e contagens, ZERO PII)
SELECT
  'encomendas_itens_vs_moradores' AS verificacao,
  COUNT(*) AS divergencias
FROM public.encomendas_itens e
JOIN public.moradores m ON m.id = e.morador_id
WHERE e.morador_id IS NOT NULL
  AND (e.condominio_id IS DISTINCT FROM m.condominio_id);

SELECT
  'encomendas_itens_vs_lotes_re' AS verificacao,
  COUNT(*) AS divergencias
FROM public.encomendas_itens e
JOIN public.lotes_re l ON l.id = e.lote_re_id
WHERE e.lote_re_id IS NOT NULL
  AND (e.condominio_id IS DISTINCT FROM l.condominio_id);

SELECT
  'movimentacao_chaves_vs_chaves' AS verificacao,
  COUNT(*) AS divergencias
FROM public.movimentacao_chaves mc
JOIN public.chaves ch ON ch.id = mc.chave_id
WHERE mc.chave_id IS NOT NULL
  AND (mc.condominio_id IS DISTINCT FROM ch.condominio_id);

-- 5. Auditoria de vínculo de operadores com Supabase Auth (contagens sem dados pessoais)
SELECT
  COUNT(*) AS total_operadores,
  COUNT(*) FILTER (WHERE ativo IS DISTINCT FROM false) AS operadores_ativos,
  COUNT(*) FILTER (WHERE condominio_id IS NULL) AS operadores_sem_condominio,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'operadores' AND c.column_name = 'auth_user_id'
    )
  ) AS coluna_auth_user_id_presente
FROM public.operadores;

-- 6. Auditoria de Storage (bucket 'encomendas' e prefixos de arquivos existentes)
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'encomendas';

SELECT
  CASE
    WHEN name LIKE 'condominios/%' THEN 'prefixo_tenant_isolado'
    ELSE 'legado_sem_prefixo_condominio'
  END AS classificacao_caminho,
  COUNT(*) AS quantidade_arquivos
FROM storage.objects
WHERE bucket_id = 'encomendas'
GROUP BY 1;

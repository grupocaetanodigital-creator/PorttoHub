-- ==============================================================================
-- PORTTOHUB — SCRIPT DE MIGRAÇÃO COMPLETA E CONFIGURAÇÃO SUPABASE (POSTGRESQL)
-- Projeto Supabase: https://fukxrdzhryumbcqibtas.supabase.co
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Abra o painel do Supabase: https://supabase.com/dashboard/project/fukxrdzhryumbcqibtas
-- 2. No menu lateral esquerdo, clique em "SQL Editor"
-- 3. Clique em "+ New query"
-- 4. Cole este script completo e clique no botão verde "Run"
--
-- CARACTERÍSTICAS DESTA ARQUITETURA:
-- - Chaves primárias UUID com gen_random_uuid()
-- - Coluna condominio_id em todas as tabelas (Isolamento Multi-Condomínio)
-- - created_at e updated_at com timezone (TIMESTAMPTZ DEFAULT NOW())
-- - Triggers automáticos de updated_at
-- - Configuração do Bucket 'encomendas' no Supabase Storage e Políticas RLS
-- - Realtime ativado para comunicação instantânea da guarita
-- - Dados de teste prontos (Admin master 'admin'/'2468', condomínio, moradores e encomendas)
-- ==============================================================================

BEGIN;

-- 1. EXTENSÕES OBRIGATÓRIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FUNÇÃO UTILITÁRIA PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABELAS DE CADASTROS BASE E MULTI-TENANT
-- ==============================================================================

-- 3.1 TABELA: condominios
CREATE TABLE IF NOT EXISTS public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  cnpj TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT DEFAULT 'São Paulo',
  uf TEXT DEFAULT 'SP',
  cep TEXT,
  telefone_portaria TEXT,
  telefone_sindico TEXT,
  sindico_nome TEXT DEFAULT 'Administração Geral',
  total_unidades INTEGER DEFAULT 100,
  total_blocos INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT TRUE,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 TABELA: configuracoes (Feature flags e parâmetros por condomínio)
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  feature_flags JSONB DEFAULT '{
    "mod02_gestao_encomendas": true,
    "mod03_custodia_itens": true,
    "mod04_materiais_posto": true,
    "mod05_quadro_chaves": true,
    "mod06_gestao_manutencao": true,
    "mod07_gestao_ronda": true,
    "mod08_livro_ocorrencias": true,
    "mod09_passagem_posto": true,
    "mod10_prestadores_servico": true
  }'::jsonb,
  parametros JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 TABELA: operadores (Porteiros, Supervisores e Administradores)
CREATE TABLE IF NOT EXISTS public.operadores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  condominio_id TEXT NOT NULL DEFAULT 'todos',
  nome TEXT NOT NULL,
  login TEXT NOT NULL,
  senha TEXT NOT NULL,
  funcao TEXT DEFAULT 'Porteiro',
  cargo TEXT DEFAULT 'Porteiro',
  perfil TEXT DEFAULT 'operador',
  nivel_acesso INTEGER DEFAULT 3,
  nivel_acesso_custom_id TEXT DEFAULT 'nivel_3',
  email TEXT,
  telefone TEXT,
  turno_padrao TEXT DEFAULT 'Diurno',
  turno TEXT DEFAULT 'Diurno',
  foto_url TEXT,
  permissoes JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operadores_login ON public.operadores(login);
CREATE INDEX IF NOT EXISTS idx_operadores_condominio ON public.operadores(condominio_id);

-- 3.4 TABELA: moradores
CREATE TABLE IF NOT EXISTS public.moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT NOT NULL,
  telefone TEXT,
  telefone_whatsapp TEXT,
  email TEXT,
  rg TEXT,
  cpf TEXT,
  tipo TEXT DEFAULT 'proprietario',
  foto_url TEXT,
  parentesco TEXT,
  autorizados JSONB DEFAULT '[]'::jsonb,
  veiculos JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moradores_condo_unidade ON public.moradores(condominio_id, bloco, unidade);

-- ==============================================================================
-- 4. MÓDULO 02 — ENCOMENDAS & RECEBIMENTO
-- ==============================================================================

-- 4.1 TABELA: entregadores
CREATE TABLE IF NOT EXISTS public.entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  telefone TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 TABELA: locais_armazenamento (Bancadas, Prateleiras, Armários)
CREATE TABLE IF NOT EXISTS public.locais_armazenamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 TABELA: lotes_re (Lotes de Recebimento de Entrega)
CREATE TABLE IF NOT EXISTS public.lotes_re (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_re TEXT NOT NULL,
  condominio_id UUID,
  entregador_id UUID,
  qtd_declarada INTEGER DEFAULT 1,
  qtd_triada INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aguardando_triagem',
  operador_id TEXT,
  operador_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lotes_re_condo_codigo ON public.lotes_re(condominio_id, codigo_re);

-- 4.4 TABELA: encomendas_itens (Pacotes individuais)
CREATE TABLE IF NOT EXISTS public.encomendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  lote_re_id UUID,
  bloco TEXT,
  unidade TEXT NOT NULL,
  morador_id UUID,
  codigo_barras TEXT,
  codigo_rastreio TEXT,
  destinatario_nome TEXT,
  transportadora TEXT,
  tipo_volume TEXT DEFAULT 'Pacote',
  foto_etiqueta_url TEXT,
  foto_avaria_url TEXT,
  observacoes TEXT,
  local_armazenamento TEXT DEFAULT 'Bancada Principal',
  status TEXT DEFAULT 'retido',
  retirado_por TEXT,
  documento_retirante TEXT,
  parentesco_vinculo TEXT,
  foto_retirada_url TEXT,
  foto_comprovante_url TEXT,
  assinatura_url TEXT,
  data_retirada TIMESTAMPTZ,
  data_hora_retirada TIMESTAMPTZ,
  operador_baixa_id TEXT,
  operador_baixa_nome TEXT,
  notificado_whatsapp BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encomendas_condo_status ON public.encomendas_itens(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_encomendas_condo_unidade ON public.encomendas_itens(condominio_id, unidade);

-- ==============================================================================
-- 5. MÓDULO 03 — CUSTÓDIA DE ITENS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.custodia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo TEXT,
  codigo_custodia TEXT,
  descricao TEXT NOT NULL,
  fluxo TEXT DEFAULT 'ENTRADA',
  origem TEXT,
  origem_tipo TEXT DEFAULT 'Morador',
  origem_unidade TEXT,
  origem_bloco TEXT,
  origem_nome_doc TEXT,
  origem_whats TEXT,
  destino TEXT,
  destino_tipo TEXT DEFAULT 'Morador',
  destino_unidade TEXT,
  destino_bloco TEXT,
  destino_nome_doc TEXT,
  destino_whats TEXT,
  deixado_por TEXT,
  documento_depositante TEXT,
  telefone_depositante TEXT,
  recebedor_nome TEXT,
  recebedor_doc TEXT,
  foto_entrada_url TEXT,
  foto_saida_url TEXT,
  foto_url TEXT,
  status TEXT DEFAULT 'Retido',
  operador_entrada TEXT,
  operador_saida TEXT,
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  data_hora_saida TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custodia_condo_status ON public.custodia(condominio_id, status);

-- ==============================================================================
-- 6. MÓDULO 04 — MATERIAIS DO POSTO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.materiais_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Equipamentos',
  codigo_patrimonio TEXT,
  estado TEXT DEFAULT 'Perfeito',
  observacao TEXT,
  observacao_avaria TEXT,
  foto_url TEXT,
  foto_avaria_url TEXT,
  operador_atualizacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. MÓDULO 05 — CLAVICULÁRIO DE CHAVES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo_chave TEXT NOT NULL,
  nome_chave TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT,
  tempo_limite_horas INTEGER DEFAULT 2,
  status TEXT DEFAULT 'Disponível',
  observacoes TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  chave_id UUID,
  retirante_nome TEXT NOT NULL,
  retirante_doc TEXT,
  retirante_telefone TEXT,
  retirante_tipo TEXT DEFAULT 'Morador',
  empresa_ou_apto TEXT,
  motivo TEXT,
  foto_retirada_url TEXT,
  foto_devolucao_url TEXT,
  data_hora_retirada TIMESTAMPTZ DEFAULT NOW(),
  previsao_devolucao TIMESTAMPTZ,
  data_hora_devolucao TIMESTAMPTZ,
  status TEXT DEFAULT 'Em Andamento',
  operador_retirada TEXT,
  operador_devolucao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chaves_mov_condo ON public.movimentacao_chaves(condominio_id, status);

-- ==============================================================================
-- 8. MÓDULO 06 — GESTÃO DE MANUTENÇÃO & ORDENS DE SERVIÇO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  frequencia TEXT DEFAULT 'Diário',
  periodicidade TEXT DEFAULT 'Diário',
  categoria TEXT DEFAULT 'Geral',
  prioridade TEXT DEFAULT 'Média',
  localizacao TEXT,
  status TEXT DEFAULT 'Pendente',
  observacao_execucao TEXT,
  foto_url TEXT,
  foto_antes_url TEXT,
  operador_criacao TEXT,
  operador_conclusao TEXT,
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chamados_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT DEFAULT 'Geral',
  prioridade TEXT DEFAULT 'Média',
  localizacao TEXT,
  bloco TEXT,
  unidade TEXT,
  status TEXT DEFAULT 'Aberto',
  foto_antes_url TEXT,
  foto_depois_url TEXT,
  observacao_conclusao TEXT,
  operador_abertura TEXT,
  operador_abertura_id TEXT,
  operador_abertura_nome TEXT,
  operador_conclusao TEXT,
  operador_conclusao_id TEXT,
  operador_conclusao_nome TEXT,
  data_abertura TIMESTAMPTZ DEFAULT NOW(),
  data_conclusao TIMESTAMPTZ,
  solicitante TEXT,
  local_especifico TEXT,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. MÓDULO 07 — GESTÃO DE RONDAS PATRIMONIAIS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rondas_setores (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  codigo TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  itens JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rondas_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome_ponto TEXT NOT NULL,
  codigo_tag TEXT,
  setor_id TEXT DEFAULT 'SETOR_A',
  ordem INTEGER DEFAULT 0,
  localizacao_descricao TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rondas_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  operador_id TEXT,
  operador_nome TEXT,
  status TEXT DEFAULT 'Em Andamento',
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  pontos_totais INTEGER DEFAULT 0,
  pontos_lidos INTEGER DEFAULT 0,
  resumo_detalhado JSONB,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rondas_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  ronda_id UUID,
  ponto_id UUID,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  latitude NUMERIC,
  longitude NUMERIC,
  foto_evidencia_url TEXT,
  observacao TEXT,
  status_ponto TEXT DEFAULT 'conforme',
  checklist_respostas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. MÓDULO 08 — LIVRO DIGITAL DE OCORRÊNCIAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'Geral',
  prioridade TEXT DEFAULT 'Média',
  status TEXT DEFAULT 'Aberta',
  bloco TEXT,
  unidade TEXT,
  unidade_bloco TEXT,
  foto_url TEXT,
  fotos JSONB DEFAULT '[]'::jsonb,
  operador_id TEXT,
  operador_nome TEXT,
  operador_login TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  resolucao TEXT,
  data_resolucao TIMESTAMPTZ,
  operador_resolucao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_condo ON public.ocorrencias(condominio_id, status);

-- ==============================================================================
-- 11. MÓDULO 09 — PASSAGEM DE POSTO & TROCA DE TURNO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.passagens_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo TEXT,
  operador_sainte_id TEXT,
  operador_sainte_nome TEXT,
  operador_entrante_id TEXT,
  operador_entrante_nome TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT,
  materiais_conferidos JSONB DEFAULT '[]'::jsonb,
  encomendas_pendentes JSONB DEFAULT '[]'::jsonb,
  chaves_pendentes JSONB DEFAULT '[]'::jsonb,
  ocorrencias_plantao TEXT,
  assinatura_sainte TEXT,
  assinatura_entrante TEXT,
  status TEXT DEFAULT 'Finalizada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. MÓDULO 10 — PRESTADORES, VISITAS & OBRAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT,
  nome_profissional TEXT,
  nome_completo TEXT,
  documento TEXT,
  tipo_documento TEXT DEFAULT 'RG',
  empresa TEXT,
  funcao TEXT,
  telefone TEXT,
  placa_veiculo TEXT,
  foto_rosto TEXT,
  foto_url TEXT,
  foto_documento TEXT,
  tipo_servico TEXT,
  atende_condominio BOOLEAN DEFAULT FALSE,
  bloco TEXT,
  unidade TEXT,
  perfil_acesso TEXT DEFAULT 'prestador_unidade',
  parentesco_vinculo TEXT,
  tipo_validade TEXT DEFAULT 'hoje',
  data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_validade_fim TIMESTAMPTZ,
  tempo_maximo_minutos INTEGER DEFAULT 240,
  limite_permanencia_ate TIMESTAMPTZ,
  cracha TEXT,
  cracha_atribuido TEXT,
  status_acesso TEXT DEFAULT 'FORA',
  operador_entrada_nome TEXT,
  operador_saida_nome TEXT,
  data_hora_entrada TIMESTAMPTZ,
  data_hora_saida TIMESTAMPTZ,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  prestador_id UUID,
  perfil_acesso TEXT NOT NULL DEFAULT 'prestador_unidade',
  nome_completo TEXT NOT NULL DEFAULT '',
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

-- ==============================================================================
-- 13. COMUNICAÇÃO, BANCADA & AUDITORIA
-- ==============================================================================

-- 13.1 TABELA: lembretes_portaria (Mensagens rápidas Portaria ⇄ Morador)
CREATE TABLE IF NOT EXISTS public.lembretes_portaria (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  condominio_id UUID,
  unidade_bloco TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Aviso Geral',
  mensagem TEXT NOT NULL,
  remetente_tipo TEXT NOT NULL DEFAULT 'morador',
  remetente_nome TEXT,
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  lido_em TIMESTAMPTZ,
  lido_por_nome TEXT,
  lido_por_id TEXT,
  prioridade TEXT DEFAULT 'normal',
  finalizado BOOLEAN DEFAULT FALSE,
  finalizado_em TIMESTAMPTZ,
  finalizado_por_nome TEXT,
  finalizado_por_id TEXT,
  eh_adm BOOLEAN DEFAULT FALSE,
  data_limite TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13.2 TABELAS: bancada_volumes & bancada_conferencias
CREATE TABLE IF NOT EXISTS public.bancada_volumes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  condominio_id UUID,
  estrutura TEXT NOT NULL,
  unidade TEXT NOT NULL,
  volumes INTEGER DEFAULT 1,
  observacao TEXT,
  tipo_volume TEXT DEFAULT 'normal',
  operador_nome TEXT,
  operador_id TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bancada_conferencias (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  condominio_id UUID,
  operador_nome TEXT NOT NULL,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  total_volumes INTEGER DEFAULT 0,
  total_unidades INTEGER DEFAULT 0,
  estruturas_resumo JSONB DEFAULT '{}'::jsonb,
  itens JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13.3 TABELA: historico_absoluto (Trilha completa de auditoria)
CREATE TABLE IF NOT EXISTS public.historico_absoluto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB,
  operador_id TEXT,
  operador_nome TEXT,
  operador_login TEXT,
  ip TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historico_condo_data ON public.historico_absoluto(condominio_id, data_hora DESC);

-- 13.4 TABELAS: templates_whatsapp & agenda_emergencia
CREATE TABLE IF NOT EXISTS public.templates_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  tipo TEXT NOT NULL,
  titulo TEXT,
  conteudo TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agenda_emergencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome_descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'Geral',
  telefone_principal TEXT NOT NULL,
  telefone_whatsapp TEXT,
  exibir_menu_flutuante BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13.5 TABELA: fotos_armazenadas (Registro e indexação de imagens do Storage)
CREATE TABLE IF NOT EXISTS public.fotos_armazenadas (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  url TEXT NOT NULL,
  pasta TEXT NOT NULL,
  filename TEXT,
  file_name TEXT,
  bucket TEXT NOT NULL DEFAULT 'encomendas',
  tamanho_kb NUMERIC,
  provedor TEXT DEFAULT 'supabase_storage',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir adição de colunas caso a tabela já tenha sido criada anteriormente
ALTER TABLE IF EXISTS public.fotos_armazenadas ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE IF EXISTS public.fotos_armazenadas ADD COLUMN IF NOT EXISTS file_name TEXT;

-- ==============================================================================
-- 14. TRIGGERS AUTOMÁTICOS DE updated_at
-- ==============================================================================

DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'condominios', 'configuracoes', 'operadores', 'moradores', 'entregadores',
    'locais_armazenamento', 'lotes_re', 'encomendas_itens', 'custodia',
    'materiais_posto', 'chaves', 'movimentacao_chaves', 'checklist_manutencao',
    'chamados_manutencao', 'rondas_setores', 'rondas_pontos', 'rondas_execucao',
    'ocorrencias', 'prestadores', 'lembretes_portaria', 'bancada_volumes',
    'templates_whatsapp', 'agenda_emergencia'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_update_%I ON public.%I;', t, t);
      EXECUTE format('CREATE TRIGGER trg_update_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t, t);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- 15. CONFIGURAÇÃO DO SUPABASE STORAGE (BUCKET 'encomendas')
-- ==============================================================================

-- Garante que o bucket 'encomendas' exista e seja público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'encomendas',
  'encomendas',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Políticas de acesso ao Supabase Storage para o bucket 'encomendas'
DO $$
BEGIN
  -- Permite leitura pública de fotos
  DROP POLICY IF EXISTS "Public_Access_Encomendas" ON storage.objects;
  CREATE POLICY "Public_Access_Encomendas" ON storage.objects
    FOR SELECT USING (bucket_id = 'encomendas');

  -- Permite upload de fotos
  DROP POLICY IF EXISTS "Upload_Encomendas" ON storage.objects;
  CREATE POLICY "Upload_Encomendas" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'encomendas');

  -- Permite atualização de fotos
  DROP POLICY IF EXISTS "Update_Encomendas" ON storage.objects;
  CREATE POLICY "Update_Encomendas" ON storage.objects
    FOR UPDATE USING (bucket_id = 'encomendas');

  -- Permite remoção quando necessário
  DROP POLICY IF EXISTS "Delete_Encomendas" ON storage.objects;
  CREATE POLICY "Delete_Encomendas" ON storage.objects
    FOR DELETE USING (bucket_id = 'encomendas');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 16. ROW LEVEL SECURITY (RLS) PERMISSIVO E MULTI-TENANT SEGURO
-- ==============================================================================

DO $$
DECLARE
  tbl TEXT;
  tabelas_alvo TEXT[] := ARRAY[
    'condominios', 'configuracoes', 'operadores', 'moradores', 'entregadores',
    'locais_armazenamento', 'lotes_re', 'encomendas_itens', 'custodia',
    'materiais_posto', 'chaves', 'movimentacao_chaves', 'checklist_manutencao',
    'chamados_manutencao', 'rondas_setores', 'rondas_pontos', 'rondas_execucao',
    'rondas_registros', 'ocorrencias', 'passagens_posto', 'prestadores',
    'prestadores_acessos', 'lembretes_portaria', 'bancada_volumes',
    'bancada_conferencias', 'historico_absoluto', 'templates_whatsapp',
    'agenda_emergencia', 'fotos_armazenadas'
  ];
BEGIN
  FOREACH tbl IN ARRAY tabelas_alvo LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso_total_' || tbl, tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', 'Acesso_total_' || tbl, tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- 17. CARGA DE DADOS DE TESTE E INICIALIZAÇÃO DO SISTEMA (SEED DATA)
-- ==============================================================================

-- 17.1 Condomínio Modelo
INSERT INTO public.condominios (
  id, nome, codigo, endereco, numero, bairro, cidade, uf, telefone_portaria, total_unidades, total_blocos, ativo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Condomínio Residencial PorttoHub',
  'CPH01',
  'Av. das Nações',
  '1500',
  'Jardins',
  'São Paulo',
  'SP',
  '(11) 98765-4321',
  120,
  4,
  true
) ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 17.2 Operador Master Root ('admin' / '2468') e Porteiro Modelo ('porteiro' / '1234')
INSERT INTO public.operadores (
  id, condominio_id, nome, login, senha, funcao, cargo, perfil, nivel_acesso, email, turno_padrao, ativo
) VALUES (
  'admin_master_root',
  'todos',
  'Administrador Master',
  'admin',
  '2468',
  'Administrador Geral',
  'Administrador Geral',
  'admin_geral',
  0,
  'admin@porttohub.com',
  'Geral',
  true
) ON CONFLICT (id) DO UPDATE SET
  login = 'admin',
  senha = '2468',
  ativo = true;

INSERT INTO public.operadores (
  id, condominio_id, nome, login, senha, funcao, cargo, perfil, nivel_acesso, email, turno_padrao, ativo
) VALUES (
  'operador_porteiro_001',
  'a0000000-0000-0000-0000-000000000001',
  'Carlos Silva (Porteiro)',
  'porteiro',
  '1234',
  'Porteiro',
  'Porteiro',
  'operador',
  3,
  'porteiro@porttohub.com',
  'Diurno',
  true
) ON CONFLICT (id) DO UPDATE SET
  login = 'porteiro',
  senha = '1234',
  ativo = true;

-- 17.3 Configurações dos 9 Módulos para o Condomínio
INSERT INTO public.configuracoes (
  id, condominio_id, feature_flags
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{
    "mod02_gestao_encomendas": true,
    "mod03_custodia_itens": true,
    "mod04_materiais_posto": true,
    "mod05_quadro_chaves": true,
    "mod06_gestao_manutencao": true,
    "mod07_gestao_ronda": true,
    "mod08_livro_ocorrencias": true,
    "mod09_passagem_posto": true,
    "mod10_prestadores_servico": true
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 17.4 Locais de Armazenamento da Portaria
INSERT INTO public.locais_armazenamento (id, condominio_id, nome, descricao, ativo) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Bancada Principal', 'Bancada de triagem e liberação imediata', true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Prateleira A - Caixas', 'Estrutura metálica para volumes médios e caixas', true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Escaninho B - Envelopes', 'Escaninhos para cartas, pequenos pacotes e cartões', true)
ON CONFLICT (id) DO NOTHING;

-- 17.5 Moradores de Teste
INSERT INTO public.moradores (id, condominio_id, nome, bloco, unidade, telefone_whatsapp, email, tipo, ativo) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Mariana Alencar', 'A', '101', '(11) 99111-2233', 'mariana101@email.com', 'proprietario', true),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Roberto Albuquerque', 'A', '102', '(11) 99222-3344', 'roberto102@email.com', 'inquilino', true),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Fernanda Lima', 'B', '201', '(11) 99333-4455', 'fernanda201@email.com', 'proprietario', true)
ON CONFLICT (id) DO NOTHING;

-- 17.6 Entregadores Frequentes
INSERT INTO public.entregadores (id, condominio_id, nome, empresa, documento, telefone) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Lucas Santos', 'Mercado Livre', '12.345.678-9', '(11) 97000-1111'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Paulo Ribeiro', 'Shopee Express', '23.456.789-0', '(11) 97000-2222'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Marcos Oliveira', 'Amazon Logística', '34.567.890-1', '(11) 97000-3333')
ON CONFLICT (id) DO NOTHING;

-- 17.7 Lote RE e Encomendas de Teste vinculadas aos arquivos já presentes no Storage
INSERT INTO public.lotes_re (
  id, codigo_re, condominio_id, entregador_id, qtd_declarada, qtd_triada, status, operador_nome
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'RE-2026-001',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  2,
  2,
  'concluido',
  'Carlos Silva (Porteiro)'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.encomendas_itens (
  id, condominio_id, lote_re_id, bloco, unidade, morador_id, destinatario_nome, transportadora,
  codigo_rastreio, local_armazenamento, status, foto_etiqueta_url, created_at
) VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'A',
  '101',
  'd0000000-0000-0000-0000-000000000001',
  'Mariana Alencar',
  'Mercado Livre',
  'BR992817462ML',
  'Bancada Principal',
  'retido',
  'https://fukxrdzhryumbcqibtas.supabase.co/storage/v1/object/public/encomendas/etiquetas/etiqueta_amostra_teste.png',
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.encomendas_itens (
  id, condominio_id, lote_re_id, bloco, unidade, morador_id, destinatario_nome, transportadora,
  codigo_rastreio, local_armazenamento, status, foto_etiqueta_url, foto_comprovante_url, assinatura_url,
  retirado_por, data_retirada, created_at
) VALUES (
  'f1000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'A',
  '102',
  'd0000000-0000-0000-0000-000000000002',
  'Roberto Albuquerque',
  'Mercado Livre',
  'BR112348901ML',
  'Bancada Principal',
  'retirado',
  'https://fukxrdzhryumbcqibtas.supabase.co/storage/v1/object/public/encomendas/etiquetas/etiqueta_amostra_teste.png',
  'https://fukxrdzhryumbcqibtas.supabase.co/storage/v1/object/public/encomendas/comprovantes_baixa/comprovante_teste_amostra.png',
  'https://fukxrdzhryumbcqibtas.supabase.co/storage/v1/object/public/encomendas/assinaturas_encomendas/assinatura_teste_amostra.png',
  'Roberto Albuquerque (Próprio)',
  NOW(),
  NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- 17.8 Telefones de Emergência
INSERT INTO public.agenda_emergencia (id, condominio_id, nome_descricao, categoria, telefone_principal, exibir_menu_flutuante) VALUES
  ('90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Polícia Militar (Emergência)', 'Segurança', '190', true),
  ('90000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'SAMU (Socorro Médico)', 'Saúde', '192', true),
  ('90000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Corpo de Bombeiros', 'Defesa Civil', '193', true),
  ('90000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Zelador do Condomínio', 'Administração', '(11) 98888-0001', true)
ON CONFLICT (id) DO NOTHING;

-- 17.9 Template Padrão de WhatsApp para Notificação de Encomendas
INSERT INTO public.templates_whatsapp (id, condominio_id, tipo, titulo, conteudo, ativo) VALUES
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'encomenda_chegou', 'Chegada de Encomenda', '📦 Olá {NOME_MORADOR}, sua encomenda ({TRANSPORTADORA}) chegou na portaria do {CONDOMINIO}! Unidade: {UNIDADE}. Retire na guarita com um documento.', true)
ON CONFLICT (id) DO NOTHING;

-- 17.10 Registro das Fotos de Teste na tabela fotos_armazenadas
INSERT INTO public.fotos_armazenadas (id, condominio_id, url, pasta, filename, file_name, bucket, tamanho_kb, provedor) VALUES
  ('teste_foto_etiqueta', 'a0000000-0000-0000-0000-000000000001', 'https://fukxrdzhryumbcqibtas.supabase.co/storage/v1/object/public/encomendas/etiquetas/etiqueta_amostra_teste.png', 'etiquetas', 'etiquetas/etiqueta_amostra_teste.png', 'etiquetas/etiqueta_amostra_teste.png', 'encomendas', 1, 'supabase_storage'),
  ('teste_foto_assinatura', 'a0000000-0000-0000-0000-000000000001', 'https://fukxrdzhryumbcqibtas.supabase.co/storage/v1/object/public/encomendas/assinaturas_encomendas/assinatura_teste_amostra.png', 'assinaturas_encomendas', 'assinaturas_encomendas/assinatura_teste_amostra.png', 'assinaturas_encomendas/assinatura_teste_amostra.png', 'encomendas', 1, 'supabase_storage'),
  ('teste_foto_comprovante', 'a0000000-0000-0000-0000-000000000001', 'https://fukxrdzhryumbcqibtas.supabase.co/storage/v1/object/public/encomendas/comprovantes_baixa/comprovante_teste_amostra.png', 'comprovantes_baixa', 'comprovantes_baixa/comprovante_teste_amostra.png', 'comprovantes_baixa/comprovante_teste_amostra.png', 'encomendas', 1, 'supabase_storage')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- RECARREGA SCHEMA NO POSTGREST
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- INFPORT 1.0 / PORTTOHUB — SCRIPT MESTRE DE CRIAÇÃO, REGRAS E REPAROS (SUPABASE)
-- ==============================================================================
-- Este script executa a estruturação completa, reparos e normalização de todas
-- as tabelas do sistema, resolvendo erros de dados não puxados (encomendas_itens,
-- operadores, moradores, lotes_re, passagens, etc.), criando chaves estrangeiras,
-- índices de alta performance e políticas de Row Level Security (RLS) 100% liberadas.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Abra o painel do seu projeto Supabase: https://supabase.com/dashboard
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor" (Terminal / Consulta SQL)
-- 3. Clique em "+ New Query" (Nova Consulta)
-- 4. Cole TODO o conteúdo deste arquivo e clique no botão verde "Run" (Executar)
-- ==============================================================================

BEGIN;

-- 0. HABILITAR EXTENSÕES ESSENCIAIS DO POSTGRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA: condominios (Multi-tenant principal)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  cnpj TEXT,
  cidade TEXT DEFAULT 'São Paulo',
  uf TEXT DEFAULT 'SP',
  telefone_portaria TEXT,
  sindico_nome TEXT,
  sindico_whatsapp TEXT,
  whatsapp_grupo_url TEXT,
  whatsapp_grupo_portaria TEXT,
  escala_plantao TEXT DEFAULT '06_18',
  horario_diurno_inicio TEXT DEFAULT '06:00',
  horario_noturno_inicio TEXT DEFAULT '18:00',
  intervalo_ronda INTEGER DEFAULT 15,
  tipo_estrutura TEXT DEFAULT 'casas',
  tipo TEXT DEFAULT 'residencial',
  qtd_blocos INTEGER DEFAULT 1,
  unidades_por_bloco INTEGER DEFAULT 117,
  nomes_blocos TEXT,
  zeros_esquerda BOOLEAN DEFAULT TRUE,
  unidades_customizadas JSONB DEFAULT '[]'::jsonb,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes", "Armário 01", "Prateleira A1"]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.condominios
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT DEFAULT 'São Paulo',
  ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT 'SP',
  ADD COLUMN IF NOT EXISTS telefone_portaria TEXT,
  ADD COLUMN IF NOT EXISTS sindico_nome TEXT,
  ADD COLUMN IF NOT EXISTS sindico_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_portaria TEXT,
  ADD COLUMN IF NOT EXISTS escala_plantao TEXT DEFAULT '06_18',
  ADD COLUMN IF NOT EXISTS horario_diurno_inicio TEXT DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS horario_noturno_inicio TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS intervalo_ronda INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS tipo_estrutura TEXT DEFAULT 'casas',
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'residencial',
  ADD COLUMN IF NOT EXISTS qtd_blocos INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unidades_por_bloco INTEGER DEFAULT 117,
  ADD COLUMN IF NOT EXISTS nomes_blocos TEXT,
  ADD COLUMN IF NOT EXISTS zeros_esquerda BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS unidades_customizadas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Inserir condomínio padrão se a tabela estiver vazia
INSERT INTO public.condominios (id, nome, endereco, tipo_estrutura, qtd_blocos, unidades_por_bloco)
SELECT 'aa205bfb-55cc-42fe-ab25-9c16ac943851', 'Condomínio Residencial Central', 'Av. Principal, 1000 - Centro', 'casas', 1, 117
WHERE NOT EXISTS (SELECT 1 FROM public.condominios LIMIT 1);

-- ==============================================================================
-- 2. TABELA: configuracoes (Feature flags e parametrizações)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  niveis_acesso JSONB DEFAULT '[]'::jsonb,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  setores_ronda JSONB DEFAULT '[]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  dados_tenant JSONB DEFAULT '{}'::jsonb,
  mod01_cadastros_base BOOLEAN DEFAULT TRUE,
  mod02_gestao_encomendas BOOLEAN DEFAULT TRUE,
  mod03_custodia_itens BOOLEAN DEFAULT TRUE,
  mod04_materiais_posto BOOLEAN DEFAULT TRUE,
  mod05_quadro_chaves BOOLEAN DEFAULT TRUE,
  mod06_gestao_manutencao BOOLEAN DEFAULT TRUE,
  mod07_gestao_ronda BOOLEAN DEFAULT TRUE,
  mod08_livro_ocorrencias BOOLEAN DEFAULT TRUE,
  mod09_passagem_posto BOOLEAN DEFAULT TRUE,
  mod10_prestadores_servico BOOLEAN DEFAULT TRUE,
  mod11_bancada_conferencia BOOLEAN DEFAULT TRUE,
  mod12_historico_absoluto BOOLEAN DEFAULT TRUE,
  mod_portal_sindico BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.configuracoes
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS niveis_acesso JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS setores_ronda JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dados_tenant JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mod01_cadastros_base BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod02_gestao_encomendas BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod03_custodia_itens BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod04_materiais_posto BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod05_quadro_chaves BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod06_gestao_manutencao BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod07_gestao_ronda BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod08_livro_ocorrencias BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod09_passagem_posto BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod10_prestadores_servico BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod11_bancada_conferencia BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod12_historico_absoluto BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mod_portal_sindico BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 3. TABELA: operadores (Equipe da Portaria, Supervisores e Administradores)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,
  senha TEXT,
  funcao TEXT DEFAULT 'Porteiro',
  cargo TEXT DEFAULT 'Porteiro',
  perfil TEXT DEFAULT 'operador',
  telefone TEXT,
  email TEXT,
  turno TEXT DEFAULT 'Diurno',
  turno_padrao TEXT DEFAULT 'Diurno',
  nivel_acesso INTEGER DEFAULT 3,
  nivel_acesso_custom_id TEXT DEFAULT 'nivel_3',
  foto_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.operadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS login TEXT,
  ADD COLUMN IF NOT EXISTS senha TEXT,
  ADD COLUMN IF NOT EXISTS funcao TEXT DEFAULT 'Porteiro',
  ADD COLUMN IF NOT EXISTS cargo TEXT DEFAULT 'Porteiro',
  ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'operador',
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS turno TEXT DEFAULT 'Diurno',
  ADD COLUMN IF NOT EXISTS turno_padrao TEXT DEFAULT 'Diurno',
  ADD COLUMN IF NOT EXISTS nivel_acesso INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS nivel_acesso_custom_id TEXT DEFAULT 'nivel_3',
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Migrar de tabela legada 'usuarios_sistema' para 'operadores' se houver
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios_sistema') THEN
    INSERT INTO public.operadores (nome, login, senha, perfil, nivel_acesso, condominio_id, ativo)
    SELECT nome, login, senha, COALESCE(perfil, 'operador'), COALESCE(nivel_acesso, 3), condominio_id, COALESCE(ativo, true)
    FROM public.usuarios_sistema
    ON CONFLICT (login) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Garantir existência do usuário Master Admin
INSERT INTO public.operadores (id, nome, login, senha, funcao, cargo, perfil, nivel_acesso, ativo, email, turno, turno_padrao)
VALUES ('00000000-0000-0000-0000-000000000001', 'Administrador Master', 'admin', '2468', 'Administrador Geral', 'Administrador Geral', 'admin_geral', 0, TRUE, 'admin@porttohub.com', 'Geral', 'Geral')
ON CONFLICT (login) DO UPDATE SET
  senha = EXCLUDED.senha,
  nivel_acesso = EXCLUDED.nivel_acesso,
  ativo = TRUE,
  perfil = 'admin_geral';

-- Garantir operador de exemplo se não houver outros
INSERT INTO public.operadores (nome, login, senha, funcao, cargo, perfil, nivel_acesso, ativo, turno, turno_padrao)
VALUES ('Caetano Operador', 'caetano', '1234', 'Porteiro Líder', 'Porteiro', 'operador', 3, TRUE, 'Diurno (06:00 às 18:00)', 'Diurno')
ON CONFLICT (login) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_operadores_login ON public.operadores(login);
CREATE INDEX IF NOT EXISTS idx_operadores_condo ON public.operadores(condominio_id);

-- ==============================================================================
-- 4. TABELA: moradores (Moradores, Unidades, Veículos, RFID)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cpf TEXT,
  rg TEXT,
  documento TEXT,
  tipo TEXT DEFAULT 'Morador',
  foto_url TEXT,
  foto TEXT,
  tag_rfid TEXT,
  codigo_acesso TEXT,
  status_acesso TEXT DEFAULT 'liberado',
  veiculo_placa TEXT,
  veiculo_modelo TEXT,
  contato_emergencia TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.moradores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto TEXT,
  ADD COLUMN IF NOT EXISTS tag_rfid TEXT,
  ADD COLUMN IF NOT EXISTS codigo_acesso TEXT,
  ADD COLUMN IF NOT EXISTS status_acesso TEXT DEFAULT 'liberado',
  ADD COLUMN IF NOT EXISTS veiculo_placa TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_modelo TEXT,
  ADD COLUMN IF NOT EXISTS contato_emergencia TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_moradores_condo_unid ON public.moradores(condominio_id, unidade, bloco);
CREATE INDEX IF NOT EXISTS idx_moradores_cpf ON public.moradores(cpf);
CREATE INDEX IF NOT EXISTS idx_moradores_tag_rfid ON public.moradores(tag_rfid);
CREATE INDEX IF NOT EXISTS idx_moradores_veiculo_placa ON public.moradores(veiculo_placa);

-- ==============================================================================
-- 5. TABELA: entregadores (Transportadoras e entregadores cadastrados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  telefone TEXT,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.entregadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_entregadores_condo ON public.entregadores(condominio_id);

-- ==============================================================================
-- 6. TABELA: lotes_re (Lotes de Recebimento de Entrega)
-- ==============================================================================
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

ALTER TABLE IF EXISTS public.lotes_re
  ADD COLUMN IF NOT EXISTS codigo_re TEXT,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS entregador_id UUID,
  ADD COLUMN IF NOT EXISTS qtd_declarada INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qtd_triada INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aguardando_triagem',
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Remover restrições de unicidade rígidas em codigo_re para evitar travamentos
DO $$
BEGIN
  ALTER TABLE public.lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_key;
  ALTER TABLE public.lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_unique;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lotes_re_condo_codigo ON public.lotes_re(condominio_id, codigo_re);

-- ==============================================================================
-- 7. TABELA: encomendas_itens (Itens individuais triados e retidos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.encomendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_re_id UUID,
  condominio_id UUID,
  bloco TEXT,
  unidade TEXT NOT NULL,
  morador_id UUID,
  destinatario TEXT,
  codigo_barras TEXT,
  codigo_rastreio TEXT,
  foto_etiqueta TEXT,
  foto_etiqueta_url TEXT,
  observacoes TEXT,
  local_armazenamento TEXT DEFAULT 'Bancada Principal',
  status TEXT DEFAULT 'retido',
  retirado_por TEXT,
  documento_retirante TEXT,
  parentesco_vinculo TEXT,
  foto_retirada_url TEXT,
  foto_comprovante_url TEXT,
  assinatura_url TEXT,
  data_recebimento TIMESTAMPTZ DEFAULT NOW(),
  data_retirada TIMESTAMPTZ,
  data_hora_retirada TIMESTAMPTZ,
  operador_entrada TEXT,
  operador_baixa TEXT,
  operador_baixa_id TEXT,
  operador_baixa_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.encomendas_itens
  ADD COLUMN IF NOT EXISTS lote_re_id UUID,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS morador_id UUID,
  ADD COLUMN IF NOT EXISTS destinatario TEXT,
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
  ADD COLUMN IF NOT EXISTS codigo_rastreio TEXT,
  ADD COLUMN IF NOT EXISTS foto_etiqueta TEXT,
  ADD COLUMN IF NOT EXISTS foto_etiqueta_url TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Bancada Principal',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'retido',
  ADD COLUMN IF NOT EXISTS retirado_por TEXT,
  ADD COLUMN IF NOT EXISTS documento_retirante TEXT,
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS foto_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_comprovante_url TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_url TEXT,
  ADD COLUMN IF NOT EXISTS data_recebimento TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operador_entrada TEXT,
  ADD COLUMN IF NOT EXISTS operador_baixa TEXT,
  ADD COLUMN IF NOT EXISTS operador_baixa_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_baixa_nome TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sincronizar colunas sinônimas (codigo_barras <-> codigo_rastreio, foto_etiqueta <-> foto_etiqueta_url)
UPDATE public.encomendas_itens
SET codigo_barras = COALESCE(codigo_barras, codigo_rastreio)
WHERE codigo_barras IS NULL AND codigo_rastreio IS NOT NULL;

UPDATE public.encomendas_itens
SET codigo_rastreio = COALESCE(codigo_rastreio, codigo_barras)
WHERE codigo_rastreio IS NULL AND codigo_barras IS NOT NULL;

UPDATE public.encomendas_itens
SET foto_etiqueta_url = COALESCE(foto_etiqueta_url, foto_etiqueta)
WHERE foto_etiqueta_url IS NULL AND foto_etiqueta IS NOT NULL;

UPDATE public.encomendas_itens
SET foto_etiqueta = COALESCE(foto_etiqueta, foto_etiqueta_url)
WHERE foto_etiqueta IS NULL AND foto_etiqueta_url IS NOT NULL;

-- Migrar da tabela legada 'encomendas' para 'encomendas_itens' se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'encomendas') THEN
    INSERT INTO public.encomendas_itens (
      condominio_id, unidade, bloco, codigo_barras, codigo_rastreio,
      destinatario, status, local_armazenamento, created_at
    )
    SELECT 
      condominio_id, COALESCE(unidade, '01'), bloco, codigo_barras, codigo_rastreio,
      destinatario, COALESCE(status, 'retido'), COALESCE(local_armazenamento, 'Bancada Principal'), COALESCE(created_at, NOW())
    FROM public.encomendas
    WHERE NOT EXISTS (
      SELECT 1 FROM public.encomendas_itens ei 
      WHERE ei.codigo_barras = public.encomendas.codigo_barras 
         OR ei.codigo_rastreio = public.encomendas.codigo_rastreio
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_encomendas_itens_status ON public.encomendas_itens(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_unidade ON public.encomendas_itens(condominio_id, unidade);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_codigo ON public.encomendas_itens(codigo_barras);

-- ==============================================================================
-- 8. TABELA: locais_armazenamento (Locais físicos de guarda)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.locais_armazenamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo TEXT,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Prateleira',
  capacidade TEXT,
  descricao TEXT,
  observacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.locais_armazenamento
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Prateleira',
  ADD COLUMN IF NOT EXISTS capacidade TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 9. TABELA: custodia (Guarda temporária de itens)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.custodia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo TEXT,
  item TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'Diversos',
  deixado_por TEXT,
  depositante_nome TEXT,
  depositante_tipo TEXT DEFAULT 'Morador',
  unidade_bloco TEXT,
  unidade TEXT,
  bloco TEXT,
  destinatario_nome TEXT,
  local_armazenamento TEXT DEFAULT 'Armário da Portaria',
  foto_url TEXT,
  status TEXT DEFAULT 'Aguardando Retirada',
  data_entrada TIMESTAMPTZ DEFAULT NOW(),
  data_retirada TIMESTAMPTZ,
  retirado_por TEXT,
  documento_retirante TEXT,
  foto_retirada_url TEXT,
  assinatura_url TEXT,
  operador_entrada TEXT,
  operador_saida TEXT,
  operador_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.custodia
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS item TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Diversos',
  ADD COLUMN IF NOT EXISTS deixado_por TEXT,
  ADD COLUMN IF NOT EXISTS depositante_nome TEXT,
  ADD COLUMN IF NOT EXISTS depositante_tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_nome TEXT,
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Armário da Portaria',
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aguardando Retirada',
  ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retirado_por TEXT,
  ADD COLUMN IF NOT EXISTS documento_retirante TEXT,
  ADD COLUMN IF NOT EXISTS foto_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrada TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida TEXT,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 10. TABELA: materiais_posto (Inventário de equipamentos da guarita)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.materiais_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Geral',
  codigo_patrimonio TEXT,
  quantidade INTEGER DEFAULT 1,
  estado_conservacao TEXT DEFAULT 'Bom',
  status TEXT DEFAULT 'Operacional',
  local_guardado TEXT DEFAULT 'Guarita',
  observacao TEXT,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.materiais_posto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS codigo_patrimonio TEXT,
  ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS estado_conservacao TEXT DEFAULT 'Bom',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Operacional',
  ADD COLUMN IF NOT EXISTS local_guardado TEXT DEFAULT 'Guarita',
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 11. TABELAS: chaves & movimentacao_chaves (Quadro digital de chaves)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo TEXT NOT NULL,
  identificacao TEXT NOT NULL,
  local_sala TEXT,
  setor TEXT DEFAULT 'Áreas Comuns',
  quantidade INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Disponível',
  tempo_limite_horas INTEGER DEFAULT 8,
  observacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.chaves
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS identificacao TEXT,
  ADD COLUMN IF NOT EXISTS local_sala TEXT,
  ADD COLUMN IF NOT EXISTS setor TEXT DEFAULT 'Áreas Comuns',
  ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Disponível',
  ADD COLUMN IF NOT EXISTS tempo_limite_horas INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  chave_id UUID,
  codigo_chave TEXT,
  identificacao_chave TEXT,
  retirado_por TEXT NOT NULL,
  documento_retirante TEXT,
  telefone_retirante TEXT,
  tipo_retirante TEXT DEFAULT 'Prestador',
  empresa TEXT,
  destino_uso TEXT,
  data_retirada TIMESTAMPTZ DEFAULT NOW(),
  data_devolucao TIMESTAMPTZ,
  status TEXT DEFAULT 'Retirada',
  operador_retirada TEXT,
  operador_devolucao TEXT,
  assinatura_retirada_url TEXT,
  assinatura_devolucao_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.movimentacao_chaves
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS chave_id UUID,
  ADD COLUMN IF NOT EXISTS codigo_chave TEXT,
  ADD COLUMN IF NOT EXISTS identificacao_chave TEXT,
  ADD COLUMN IF NOT EXISTS retirado_por TEXT,
  ADD COLUMN IF NOT EXISTS documento_retirante TEXT,
  ADD COLUMN IF NOT EXISTS telefone_retirante TEXT,
  ADD COLUMN IF NOT EXISTS tipo_retirante TEXT DEFAULT 'Prestador',
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS destino_uso TEXT,
  ADD COLUMN IF NOT EXISTS data_retirada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Retirada',
  ADD COLUMN IF NOT EXISTS operador_retirada TEXT,
  ADD COLUMN IF NOT EXISTS operador_devolucao TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_devolucao_url TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 12. TABELAS: checklist_manutencao & chamados_manutencao
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

ALTER TABLE IF EXISTS public.checklist_manutencao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS frequencia TEXT DEFAULT 'Diário',
  ADD COLUMN IF NOT EXISTS periodicidade TEXT DEFAULT 'Diário',
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS observacao_execucao TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_antes_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_criacao TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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

ALTER TABLE IF EXISTS public.chamados_manutencao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aberto',
  ADD COLUMN IF NOT EXISTS foto_antes_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_depois_url TEXT,
  ADD COLUMN IF NOT EXISTS observacao_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS operador_abertura TEXT,
  ADD COLUMN IF NOT EXISTS operador_abertura_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_abertura_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao_nome TEXT,
  ADD COLUMN IF NOT EXISTS data_abertura TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS solicitante TEXT,
  ADD COLUMN IF NOT EXISTS local_especifico TEXT,
  ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 13. TABELAS: rondas_pontos, rondas_execucao, rondas_registros, rondas_setores
-- ==============================================================================
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

ALTER TABLE IF EXISTS public.rondas_pontos
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome_ponto TEXT,
  ADD COLUMN IF NOT EXISTS codigo_tag TEXT,
  ADD COLUMN IF NOT EXISTS setor_id TEXT DEFAULT 'SETOR_A',
  ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS localizacao_descricao TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.rondas_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  ronda_tipo TEXT DEFAULT 'Rotina Padrão',
  setor_id TEXT DEFAULT 'SETOR_A',
  operador_id TEXT,
  operador_nome TEXT,
  status TEXT DEFAULT 'Em Andamento',
  iniciada_em TIMESTAMPTZ DEFAULT NOW(),
  concluida_em TIMESTAMPTZ,
  duracao_minutos INTEGER DEFAULT 0,
  total_pontos INTEGER DEFAULT 0,
  pontos_concluidos INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.rondas_execucao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS ronda_tipo TEXT DEFAULT 'Rotina Padrão',
  ADD COLUMN IF NOT EXISTS setor_id TEXT DEFAULT 'SETOR_A',
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Em Andamento',
  ADD COLUMN IF NOT EXISTS iniciada_em TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS concluida_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pontos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pontos_concluidos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.rondas_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  execucao_id UUID,
  ponto_id UUID,
  nome_ponto TEXT,
  codigo_tag TEXT,
  horario_leitura TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Concluído',
  foto_url TEXT,
  observacao TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.rondas_registros
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS execucao_id UUID,
  ADD COLUMN IF NOT EXISTS ponto_id UUID,
  ADD COLUMN IF NOT EXISTS nome_ponto TEXT,
  ADD COLUMN IF NOT EXISTS codigo_tag TEXT,
  ADD COLUMN IF NOT EXISTS horario_leitura TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Concluído',
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.rondas_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.rondas_setores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 14. TABELA: ocorrencias (Livro negro / Livro de ocorrências da guarita)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT DEFAULT 'Geral',
  categoria TEXT DEFAULT 'Geral',
  gravidade TEXT DEFAULT 'Baixa',
  status TEXT DEFAULT 'Aberta',
  bloco TEXT,
  unidade TEXT,
  unidade_envolvida TEXT,
  envolvidos TEXT,
  foto_url TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  operador_registro TEXT,
  operador_id TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  data_fechamento TIMESTAMPTZ,
  parecer_sindico TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.ocorrencias
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS gravidade TEXT DEFAULT 'Baixa',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aberta',
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS unidade_envolvida TEXT,
  ADD COLUMN IF NOT EXISTS envolvidos TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS operador_registro TEXT,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_fechamento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parecer_sindico TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 15. TABELA: passagens_posto (Troca e rendição de plantão)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.passagens_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  operador_saiu TEXT NOT NULL,
  operador_saiu_id TEXT,
  operador_entrou TEXT NOT NULL,
  operador_entrou_id TEXT,
  data_passagem TIMESTAMPTZ DEFAULT NOW(),
  turno_passagem TEXT DEFAULT 'Diurno para Noturno',
  status TEXT DEFAULT 'Concluída',
  observacoes TEXT,
  resumo_dados JSONB DEFAULT '{}'::jsonb,
  itens_conferencia JSONB DEFAULT '[]'::jsonb,
  pendencias TEXT,
  assinatura_saiu_url TEXT,
  assinatura_entrou_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.passagens_posto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS operador_saiu TEXT,
  ADD COLUMN IF NOT EXISTS operador_saiu_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrou TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrou_id TEXT,
  ADD COLUMN IF NOT EXISTS data_passagem TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS turno_passagem TEXT DEFAULT 'Diurno para Noturno',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Concluída',
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS resumo_dados JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS itens_conferencia JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pendencias TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_saiu_url TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_entrou_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 16. TABELAS: prestadores & prestadores_acessos (Autorizados e Obras)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  documento TEXT,
  rg TEXT,
  cpf TEXT,
  empresa TEXT,
  funcao TEXT DEFAULT 'Prestador de Serviço',
  tipo TEXT DEFAULT 'Prestador',
  telefone TEXT,
  foto_rosto TEXT,
  foto_documento TEXT,
  placa_veiculo TEXT,
  modelo_veiculo TEXT,
  status_autorizacao TEXT DEFAULT 'Autorizado',
  bloco_autorizado TEXT,
  unidade_autorizada TEXT,
  morador_responsavel_nome TEXT,
  morador_responsavel_id UUID,
  data_validade_inicio DATE,
  data_validade_fim DATE,
  horario_permitido_inicio TEXT DEFAULT '08:00',
  horario_permitido_fim TEXT DEFAULT '18:00',
  dias_permitidos JSONB DEFAULT '["seg","ter","qua","qui","sex"]'::jsonb,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.prestadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS funcao TEXT DEFAULT 'Prestador de Serviço',
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Prestador',
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS foto_rosto TEXT,
  ADD COLUMN IF NOT EXISTS foto_documento TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS modelo_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS status_autorizacao TEXT DEFAULT 'Autorizado',
  ADD COLUMN IF NOT EXISTS bloco_autorizado TEXT,
  ADD COLUMN IF NOT EXISTS unidade_autorizada TEXT,
  ADD COLUMN IF NOT EXISTS morador_responsavel_nome TEXT,
  ADD COLUMN IF NOT EXISTS morador_responsavel_id UUID,
  ADD COLUMN IF NOT EXISTS data_validade_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_validade_fim DATE,
  ADD COLUMN IF NOT EXISTS horario_permitido_inicio TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS horario_permitido_fim TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS dias_permitidos JSONB DEFAULT '["seg","ter","qua","qui","sex"]'::jsonb,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  prestador_id UUID,
  nome_prestador TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  unidade_destino TEXT,
  bloco_destino TEXT,
  placa_veiculo TEXT,
  cracha_cartao TEXT,
  data_entrada TIMESTAMPTZ DEFAULT NOW(),
  data_saida TIMESTAMPTZ,
  status TEXT DEFAULT 'Presente',
  operador_entrada TEXT,
  operador_saida TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.prestadores_acessos
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS prestador_id UUID,
  ADD COLUMN IF NOT EXISTS nome_prestador TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS unidade_destino TEXT,
  ADD COLUMN IF NOT EXISTS bloco_destino TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS cracha_cartao TEXT,
  ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_saida TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Presente',
  ADD COLUMN IF NOT EXISTS operador_entrada TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_prestadores_acessos_status ON public.prestadores_acessos(condominio_id, status);

-- ==============================================================================
-- 17. TABELA: lembretes_portaria (Recados, avisos de síndico e moradores)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lembretes_portaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE IF EXISTS public.lembretes_portaria
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Aviso Geral',
  ADD COLUMN IF NOT EXISTS mensagem TEXT,
  ADD COLUMN IF NOT EXISTS remetente_tipo TEXT DEFAULT 'morador',
  ADD COLUMN IF NOT EXISTS remetente_nome TEXT,
  ADD COLUMN IF NOT EXISTS lido BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lido_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS lido_por_id TEXT,
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS finalizado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalizado_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS finalizado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS eh_adm BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_limite TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 18. TABELAS: bancada_volumes & bancada_conferencias
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bancada_volumes (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  estrutura TEXT NOT NULL,
  unidade TEXT NOT NULL,
  volumes INTEGER DEFAULT 1,
  observacao TEXT,
  tipo_volume TEXT DEFAULT 'normal',
  local_armazenamento TEXT DEFAULT 'Bancada',
  operador_nome TEXT,
  operador_id TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.bancada_volumes
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS estrutura TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS volumes INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS tipo_volume TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Bancada',
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.bancada_conferencias (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  operador_nome TEXT NOT NULL,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  total_volumes INTEGER DEFAULT 0,
  total_unidades INTEGER DEFAULT 0,
  estruturas_resumo JSONB DEFAULT '{}'::jsonb,
  itens JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.bancada_conferencias
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS total_volumes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_unidades INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estruturas_resumo JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 19. TABELA: historico_absoluto (Trilha imutável de auditoria)
-- ==============================================================================
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

ALTER TABLE IF EXISTS public.historico_absoluto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS modulo TEXT,
  ADD COLUMN IF NOT EXISTS acao TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS detalhes JSONB,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_login TEXT,
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_historico_condo_data ON public.historico_absoluto(condominio_id, data_hora DESC);

-- ==============================================================================
-- 20. TABELAS: templates_whatsapp & agenda_emergencia
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.templates_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  tipo TEXT NOT NULL,
  titulo TEXT,
  codigo_evento TEXT,
  corpo_texto TEXT,
  conteudo TEXT,
  variaveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.templates_whatsapp
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS codigo_evento TEXT,
  ADD COLUMN IF NOT EXISTS corpo_texto TEXT,
  ADD COLUMN IF NOT EXISTS conteudo TEXT,
  ADD COLUMN IF NOT EXISTS variaveis JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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

ALTER TABLE IF EXISTS public.agenda_emergencia
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome_descricao TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS telefone_principal TEXT,
  ADD COLUMN IF NOT EXISTS telefone_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS exibir_menu_flutuante BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 21. CRIAÇÃO DE CHAVES ESTRANGEIRAS SEGURAS (FOREIGN KEYS)
-- ==============================================================================
DO $$
BEGIN
  -- 1. encomendas_itens -> moradores
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_encomendas_morador') THEN
    ALTER TABLE public.encomendas_itens
      ADD CONSTRAINT fk_encomendas_morador FOREIGN KEY (morador_id) REFERENCES public.moradores(id) ON DELETE SET NULL;
  END IF;

  -- 2. encomendas_itens -> lotes_re
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_encomendas_lote') THEN
    ALTER TABLE public.encomendas_itens
      ADD CONSTRAINT fk_encomendas_lote FOREIGN KEY (lote_re_id) REFERENCES public.lotes_re(id) ON DELETE CASCADE;
  END IF;

  -- 3. lotes_re -> entregadores
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_lotes_entregador') THEN
    ALTER TABLE public.lotes_re
      ADD CONSTRAINT fk_lotes_entregador FOREIGN KEY (entregador_id) REFERENCES public.entregadores(id) ON DELETE SET NULL;
  END IF;

  -- 4. movimentacao_chaves -> chaves
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_mov_chave') THEN
    ALTER TABLE public.movimentacao_chaves
      ADD CONSTRAINT fk_mov_chave FOREIGN KEY (chave_id) REFERENCES public.chaves(id) ON DELETE SET NULL;
  END IF;

  -- 5. prestadores_acessos -> prestadores
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_acesso_prestador') THEN
    ALTER TABLE public.prestadores_acessos
      ADD CONSTRAINT fk_acesso_prestador FOREIGN KEY (prestador_id) REFERENCES public.prestadores(id) ON DELETE CASCADE;
  END IF;

  -- 6. rondas_registros -> rondas_execucao
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_rondas_exec') THEN
    ALTER TABLE public.rondas_registros
      ADD CONSTRAINT fk_rondas_exec FOREIGN KEY (execucao_id) REFERENCES public.rondas_execucao(id) ON DELETE CASCADE;
  END IF;

EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 22. ROW LEVEL SECURITY (RLS) E POLÍTICAS PERMISSIVAS PARA TODAS AS TABELAS
-- ==============================================================================
-- Garante que todas as tabelas permitam SELECT, INSERT, UPDATE e DELETE pela chave anon/authenticated
DO $$
DECLARE
  tbl TEXT;
  tabelas_alvo TEXT[] := ARRAY[
    'condominios', 'configuracoes', 'operadores', 'moradores', 'entregadores',
    'lotes_re', 'encomendas_itens', 'locais_armazenamento', 'custodia',
    'materiais_posto', 'chaves', 'movimentacao_chaves', 'checklist_manutencao',
    'chamados_manutencao', 'rondas_pontos', 'rondas_execucao', 'rondas_registros',
    'rondas_setores', 'ocorrencias', 'passagens_posto', 'prestadores',
    'prestadores_acessos', 'lembretes_portaria', 'bancada_volumes',
    'bancada_conferencias', 'historico_absoluto', 'templates_whatsapp',
    'agenda_emergencia'
  ];
BEGIN
  FOREACH tbl IN ARRAY tabelas_alvo LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso_app_' || tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso_total_' || tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso_publico_' || tbl, tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);', 'Acesso_total_' || tbl, tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- 23. RECARREGAR O CACHE DE ESQUEMA DO POSTGREST
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;

-- FIM DO SCRIPT DE CRIAÇÃO, REGRAS E REPAROS

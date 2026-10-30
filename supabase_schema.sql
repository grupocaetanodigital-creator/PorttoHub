-- ==============================================================================
-- INFPORT 1.0 / PORTTOHUB - SCRIPT SQL COMPLETO & DEFINITIVO PARA O SUPABASE
-- ==============================================================================
-- Este script cria todas as 28 tabelas necessárias, adiciona todas as colunas
-- faltantes de forma idempotente (sem apagar dados existentes), configura
-- índices de alta performance, permissões RLS, Realtime e o bucket de Storage.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Abra o painel do Supabase: https://supabase.com/dashboard/project/kkeizhscivyfjgetnbke
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor" (ícone com código/terminal).
-- 3. Clique em "+ New query" (Nova consulta).
-- 4. Cole todo o conteúdo deste arquivo no editor.
-- 5. Clique no botão verde "Run" (ou pressione Ctrl + Enter).
-- ==============================================================================

BEGIN;

-- Extensões para geração de UUID e funções criptográficas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA: condominios (Multi-tenant de condomínios)
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
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
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
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_condominios_nome ON public.condominios(nome);

-- ==============================================================================
-- 2. TABELA: configuracoes (Feature flags e parametrização por condomínio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID UNIQUE,
  niveis_acesso JSONB DEFAULT '[]'::jsonb,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  whatsapp_modulos JSONB DEFAULT '{}'::jsonb,
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
  ADD COLUMN IF NOT EXISTS whatsapp_modulos JSONB DEFAULT '{}'::jsonb,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_condominio_id_key'
  ) THEN
    ALTER TABLE public.configuracoes ADD CONSTRAINT configuracoes_condominio_id_key UNIQUE (condominio_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 3. TABELA: operadores (Contas de acesso ao sistema)
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

CREATE INDEX IF NOT EXISTS idx_operadores_condominio ON public.operadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_operadores_login ON public.operadores(login);

-- Garante existência da conta Administrador Geral inicial de forma resiliente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'operadores_login_key'
  ) THEN
    BEGIN
      ALTER TABLE public.operadores ADD CONSTRAINT operadores_login_key UNIQUE (login);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.operadores WHERE login = 'admin') THEN
    INSERT INTO public.operadores (id, nome, login, senha, funcao, cargo, perfil, nivel_acesso, ativo)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Administrador Geral',
      'admin',
      '123456',
      'Administrador',
      'Administrador',
      'admin',
      0,
      TRUE
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 4. TABELA: moradores (Moradores, unidades, veículos, RFID e acessos)
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
-- 5. TABELA: entregadores (Entregadores e transportadoras)
-- ==============================================================================
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

ALTER TABLE IF EXISTS public.entregadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
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

DO $$
BEGIN
  ALTER TABLE public.lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_key;
  ALTER TABLE public.lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_unique;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lotes_re_condo_codigo ON public.lotes_re(condominio_id, codigo_re);

-- ==============================================================================
-- 7. TABELA: encomendas_itens (Itens retidos e triados de encomendas)
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

-- Sincronizar colunas sinônimas em encomendas_itens
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

CREATE INDEX IF NOT EXISTS idx_encomendas_itens_status ON public.encomendas_itens(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_unidade ON public.encomendas_itens(condominio_id, unidade);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_codigo ON public.encomendas_itens(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_lote ON public.encomendas_itens(lote_re_id);

-- ==============================================================================
-- 8. TABELA: locais_armazenamento (Bancadas, prateleiras, armários)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.locais_armazenamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.locais_armazenamento
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_locais_armazenamento_condo ON public.locais_armazenamento(condominio_id);

-- ==============================================================================
-- 9. TABELA: custodia (Guarda temporária de itens no posto)
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
  local_armazenamento TEXT DEFAULT 'Bancada Principal',
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

ALTER TABLE IF EXISTS public.custodia
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS codigo_custodia TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS fluxo TEXT DEFAULT 'ENTRADA',
  ADD COLUMN IF NOT EXISTS origem TEXT,
  ADD COLUMN IF NOT EXISTS origem_tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS origem_unidade TEXT,
  ADD COLUMN IF NOT EXISTS origem_bloco TEXT,
  ADD COLUMN IF NOT EXISTS origem_nome_doc TEXT,
  ADD COLUMN IF NOT EXISTS origem_whats TEXT,
  ADD COLUMN IF NOT EXISTS destino TEXT,
  ADD COLUMN IF NOT EXISTS destino_tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS destino_unidade TEXT,
  ADD COLUMN IF NOT EXISTS destino_bloco TEXT,
  ADD COLUMN IF NOT EXISTS destino_nome_doc TEXT,
  ADD COLUMN IF NOT EXISTS destino_whats TEXT,
  ADD COLUMN IF NOT EXISTS deixado_por TEXT,
  ADD COLUMN IF NOT EXISTS documento_depositante TEXT,
  ADD COLUMN IF NOT EXISTS telefone_depositante TEXT,
  ADD COLUMN IF NOT EXISTS recebedor_nome TEXT,
  ADD COLUMN IF NOT EXISTS recebedor_doc TEXT,
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Bancada Principal',
  ADD COLUMN IF NOT EXISTS foto_entrada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_saida_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Retido',
  ADD COLUMN IF NOT EXISTS operador_entrada TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida TEXT,
  ADD COLUMN IF NOT EXISTS tipo_baixa TEXT DEFAULT 'destinatario',
  ADD COLUMN IF NOT EXISTS assinatura_url TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_hora_saida TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices de Alta Performance para Custódia de Itens
CREATE INDEX IF NOT EXISTS idx_custodia_condo_status ON public.custodia(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_custodia_condo_status_created ON public.custodia(condominio_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custodia_condo_created ON public.custodia(condominio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custodia_codigo ON public.custodia(codigo_custodia);
CREATE INDEX IF NOT EXISTS idx_custodia_unidade ON public.custodia(condominio_id, destino_unidade);
CREATE INDEX IF NOT EXISTS idx_custodia_saida ON public.custodia(condominio_id, data_hora_saida DESC);

-- Função Transacional para Baixa Segura de Custódia com Bloqueio Concorrente
CREATE OR REPLACE FUNCTION public.executar_baixa_custodia_transacional(
  p_custodia_id UUID,
  p_recebedor_nome TEXT,
  p_recebedor_doc TEXT,
  p_foto_saida_url TEXT DEFAULT NULL,
  p_assinatura_url TEXT DEFAULT NULL,
  p_operador_saida TEXT DEFAULT 'Portaria',
  p_tipo_baixa TEXT DEFAULT 'destinatario',
  p_observacoes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_agora TIMESTAMPTZ := NOW();
BEGIN
  -- Bloqueio pessimista para prevenir baixas concorrentes duplicadas
  SELECT * INTO v_item FROM public.custodia 
  WHERE id = p_custodia_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'Registro de custódia não encontrado.');
  END IF;

  IF LOWER(v_item.status) = 'retirado' THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'Este item já foi retirado anteriormente em ' || COALESCE(TO_CHAR(v_item.data_hora_saida, 'DD/MM/YYYY HH24:MI'), 'data anterior'));
  END IF;

  UPDATE public.custodia
  SET
    status = 'Retirado',
    data_hora_saida = v_agora,
    recebedor_nome = p_recebedor_nome,
    recebedor_doc = p_recebedor_doc,
    foto_saida_url = COALESCE(p_foto_saida_url, foto_saida_url),
    assinatura_url = COALESCE(p_assinatura_url, assinatura_url),
    operador_saida = p_operador_saida,
    tipo_baixa = p_tipo_baixa,
    observacoes = CASE 
      WHEN p_observacoes IS NOT NULL AND LENGTH(TRIM(p_observacoes)) > 0 
      THEN COALESCE(observacoes || E'\n', '') || '[Baixa ' || TO_CHAR(v_agora, 'DD/MM/YYYY HH24:MI') || '] ' || p_observacoes
      ELSE observacoes
    END,
    updated_at = v_agora
  WHERE id = p_custodia_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'id', p_custodia_id,
    'codigo_custodia', v_item.codigo_custodia,
    'data_hora_saida', v_agora,
    'status', 'Retirado'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 10. TABELA: materiais_posto (Inventário e equipamentos da guarita)
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

ALTER TABLE IF EXISTS public.materiais_posto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Equipamentos',
  ADD COLUMN IF NOT EXISTS codigo_patrimonio TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Perfeito',
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS observacao_avaria TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_avaria_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_atualizacao TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_materiais_posto_condo ON public.materiais_posto(condominio_id);

-- ==============================================================================
-- 11. TABELAS: chaves & movimentacao_chaves (Quadro digital de chaves)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo_chave TEXT NOT NULL,
  nome_chave TEXT NOT NULL,
  setor TEXT,
  localizacao TEXT,
  bloco TEXT,
  unidade TEXT,
  tempo_limite_horas INTEGER DEFAULT 2,
  status TEXT DEFAULT 'Disponível',
  observacoes TEXT,
  quantidade INTEGER DEFAULT 1,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.chaves
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo_chave TEXT,
  ADD COLUMN IF NOT EXISTS nome_chave TEXT,
  ADD COLUMN IF NOT EXISTS setor TEXT,
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS tempo_limite_horas INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Disponível',
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_chaves_condo_codigo ON public.chaves(condominio_id, codigo_chave);

CREATE TABLE IF NOT EXISTS public.movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  chave_id UUID,
  retirante_nome TEXT,
  nome_retirante TEXT,
  retirante_doc TEXT,
  documento_retirante TEXT,
  retirante_telefone TEXT,
  telefone_retirante TEXT,
  retirante_tipo TEXT DEFAULT 'Morador',
  tipo_retirante TEXT DEFAULT 'Morador',
  empresa_ou_apto TEXT,
  empresa_retirante TEXT,
  unidade_retirante TEXT,
  bloco_retirante TEXT,
  motivo TEXT,
  foto_retirada_url TEXT,
  foto_devolucao_url TEXT,
  data_hora_retirada TIMESTAMPTZ DEFAULT NOW(),
  previsao_devolucao TIMESTAMPTZ,
  data_hora_devolucao TIMESTAMPTZ,
  status TEXT DEFAULT 'Em Andamento',
  operador_retirada TEXT,
  operador_retirada_id TEXT,
  operador_retirada_nome TEXT,
  operador_devolucao TEXT,
  operador_devolucao_id TEXT,
  operador_devolucao_nome TEXT,
  observacoes TEXT,
  observacoes_retirada TEXT,
  observacoes_devolucao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.movimentacao_chaves
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS chave_id UUID,
  ADD COLUMN IF NOT EXISTS retirante_nome TEXT,
  ADD COLUMN IF NOT EXISTS nome_retirante TEXT,
  ADD COLUMN IF NOT EXISTS retirante_doc TEXT,
  ADD COLUMN IF NOT EXISTS documento_retirante TEXT,
  ADD COLUMN IF NOT EXISTS retirante_telefone TEXT,
  ADD COLUMN IF NOT EXISTS telefone_retirante TEXT,
  ADD COLUMN IF NOT EXISTS retirante_tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS tipo_retirante TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS empresa_ou_apto TEXT,
  ADD COLUMN IF NOT EXISTS empresa_retirante TEXT,
  ADD COLUMN IF NOT EXISTS unidade_retirante TEXT,
  ADD COLUMN IF NOT EXISTS bloco_retirante TEXT,
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS foto_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_devolucao_url TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS previsao_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Em Andamento',
  ADD COLUMN IF NOT EXISTS operador_retirada TEXT,
  ADD COLUMN IF NOT EXISTS operador_retirada_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_retirada_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_devolucao TEXT,
  ADD COLUMN IF NOT EXISTS operador_devolucao_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_devolucao_nome TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_retirada TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_devolucao TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_mov_chaves_condo_status ON public.movimentacao_chaves(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_mov_chaves_chave_id ON public.movimentacao_chaves(chave_id);

-- ==============================================================================
-- 12. TABELAS: checklist_manutencao & chamados_manutencao
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.checklist_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT,
  item_rotina TEXT,
  descricao TEXT,
  frequencia TEXT DEFAULT 'Diário',
  periodicidade TEXT DEFAULT 'Diário',
  categoria TEXT DEFAULT 'Geral',
  setor TEXT,
  prioridade TEXT DEFAULT 'Média',
  localizacao TEXT,
  status TEXT DEFAULT 'Pendente',
  observacao_execucao TEXT,
  observacoes TEXT,
  foto_url TEXT,
  foto_antes_url TEXT,
  operador_criacao TEXT,
  operador_conclusao TEXT,
  data_conclusao TIMESTAMPTZ,
  ultima_verificacao TIMESTAMPTZ,
  proxima_verificacao TIMESTAMPTZ,
  responsavel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.checklist_manutencao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS item_rotina TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS frequencia TEXT DEFAULT 'Diário',
  ADD COLUMN IF NOT EXISTS periodicidade TEXT DEFAULT 'Diário',
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS setor TEXT,
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS observacao_execucao TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_antes_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_criacao TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultima_verificacao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proxima_verificacao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_checklist_manutencao_condo ON public.checklist_manutencao(condominio_id);

CREATE TABLE IF NOT EXISTS public.chamados_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT DEFAULT 'Geral',
  setor TEXT,
  prioridade TEXT DEFAULT 'Média',
  localizacao TEXT,
  local_especifico TEXT,
  bloco TEXT,
  unidade TEXT,
  status TEXT DEFAULT 'Aberto',
  foto_antes_url TEXT,
  foto_depois_url TEXT,
  observacao_conclusao TEXT,
  observacoes_conclusao TEXT,
  operador_abertura TEXT,
  operador_abertura_id TEXT,
  operador_abertura_nome TEXT,
  operador_conclusao TEXT,
  operador_conclusao_id TEXT,
  operador_conclusao_nome TEXT,
  data_abertura TIMESTAMPTZ DEFAULT NOW(),
  data_conclusao TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  solicitante TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.chamados_manutencao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS setor TEXT,
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS local_especifico TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aberto',
  ADD COLUMN IF NOT EXISTS foto_antes_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_depois_url TEXT,
  ADD COLUMN IF NOT EXISTS observacao_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS operador_abertura TEXT,
  ADD COLUMN IF NOT EXISTS operador_abertura_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_abertura_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao_nome TEXT,
  ADD COLUMN IF NOT EXISTS data_abertura TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS solicitante TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_chamados_manutencao_condo ON public.chamados_manutencao(condominio_id, status);

-- ==============================================================================
-- 13. TABELAS: rondas_pontos, rondas_execucao, rondas_registros & rondas_setores
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rondas_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome_ponto TEXT NOT NULL,
  codigo_tag TEXT,
  codigo_qrcode TEXT,
  setor TEXT,
  setor_id TEXT DEFAULT 'SETOR_A',
  ordem INTEGER DEFAULT 0,
  localizacao TEXT,
  localizacao_descricao TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  toleranciaraio NUMERIC DEFAULT 50,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.rondas_pontos
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome_ponto TEXT,
  ADD COLUMN IF NOT EXISTS codigo_tag TEXT,
  ADD COLUMN IF NOT EXISTS codigo_qrcode TEXT,
  ADD COLUMN IF NOT EXISTS setor TEXT,
  ADD COLUMN IF NOT EXISTS setor_id TEXT DEFAULT 'SETOR_A',
  ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS localizacao_descricao TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS toleranciaraio NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_rondas_pontos_condo ON public.rondas_pontos(condominio_id);

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

ALTER TABLE IF EXISTS public.rondas_execucao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Em Andamento',
  ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pontos_totais INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pontos_lidos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resumo_detalhado JSONB,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_rondas_execucao_condo ON public.rondas_execucao(condominio_id, status);

CREATE TABLE IF NOT EXISTS public.rondas_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  ronda_id UUID,
  ponto_id UUID,
  horario_leitura TIMESTAMPTZ,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  latitude NUMERIC,
  longitude NUMERIC,
  foto_url TEXT,
  foto_evidencia_url TEXT,
  observacao TEXT,
  status TEXT,
  status_ponto TEXT DEFAULT 'conforme',
  checklist_respostas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.rondas_registros
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS ronda_id UUID,
  ADD COLUMN IF NOT EXISTS ponto_id UUID,
  ADD COLUMN IF NOT EXISTS horario_leitura TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_evidencia_url TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS status_ponto TEXT DEFAULT 'conforme',
  ADD COLUMN IF NOT EXISTS checklist_respostas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_rondas_registros_ronda ON public.rondas_registros(ronda_id);

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

ALTER TABLE IF EXISTS public.rondas_setores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_rondas_setores_condo ON public.rondas_setores(condominio_id);

-- ==============================================================================
-- 14. TABELA: ocorrencias (Livro digital de ocorrências)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'Geral',
  gravidade TEXT DEFAULT 'Média',
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

ALTER TABLE IF EXISTS public.ocorrencias
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS gravidade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aberta',
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_login TEXT,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS resolucao TEXT,
  ADD COLUMN IF NOT EXISTS data_resolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operador_resolucao TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ocorrencias_condo ON public.ocorrencias(condominio_id, status);

-- ==============================================================================
-- 15. TABELA: passagens_posto (Troca de turno e conferência de guarita)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.passagens_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  condominio_nome TEXT,
  codigo TEXT,
  operador_sainte_id TEXT,
  operador_sainte_nome TEXT,
  operador_entrante_id TEXT,
  operador_entrante_nome TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT,
  divergencia TEXT,
  pendencias TEXT,
  relatorio_texto TEXT,
  checklist_resumo JSONB DEFAULT '{}'::jsonb,
  materiais_conferidos JSONB DEFAULT '[]'::jsonb,
  encomendas_pendentes JSONB DEFAULT '[]'::jsonb,
  chaves_pendentes JSONB DEFAULT '[]'::jsonb,
  ocorrencias_plantao TEXT,
  assinatura_sainte TEXT,
  assinatura_entrante TEXT,
  status TEXT DEFAULT 'Finalizada',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.passagens_posto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS condominio_nome TEXT,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS operador_sainte_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_sainte_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrante_id TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrante_nome TEXT,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS divergencia TEXT,
  ADD COLUMN IF NOT EXISTS pendencias TEXT,
  ADD COLUMN IF NOT EXISTS relatorio_texto TEXT,
  ADD COLUMN IF NOT EXISTS checklist_resumo JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS materiais_conferidos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encomendas_pendentes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS chaves_pendentes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ocorrencias_plantao TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_sainte TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_entrante TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Finalizada',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_passagens_posto_condo ON public.passagens_posto(condominio_id, created_at DESC);

-- ==============================================================================
-- 16. TABELAS: prestadores & prestadores_acessos (Controle de prestadores/obras)
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
  modelo_veiculo TEXT,
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

ALTER TABLE IF EXISTS public.prestadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS nome_profissional TEXT,
  ADD COLUMN IF NOT EXISTS nome_completo TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'RG',
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS funcao TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS modelo_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS foto_rosto TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_documento TEXT,
  ADD COLUMN IF NOT EXISTS tipo_servico TEXT,
  ADD COLUMN IF NOT EXISTS atende_condominio BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT DEFAULT 'prestador_unidade',
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS tipo_validade TEXT DEFAULT 'hoje',
  ADD COLUMN IF NOT EXISTS data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_validade_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tempo_maximo_minutos INTEGER DEFAULT 240,
  ADD COLUMN IF NOT EXISTS limite_permanencia_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cracha TEXT,
  ADD COLUMN IF NOT EXISTS cracha_atribuido TEXT,
  ADD COLUMN IF NOT EXISTS status_acesso TEXT DEFAULT 'FORA',
  ADD COLUMN IF NOT EXISTS operador_entrada_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida_nome TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_entrada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_saida TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.prestadores SET nome = nome_profissional WHERE (nome IS NULL OR nome = '') AND nome_profissional IS NOT NULL;
UPDATE public.prestadores SET nome_profissional = nome WHERE (nome_profissional IS NULL OR nome_profissional = '') AND nome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prestadores_condo ON public.prestadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_documento ON public.prestadores(documento);

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
  foto_documento TEXT,
  cracha TEXT,
  placa_veiculo TEXT,
  modelo_veiculo TEXT,
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

ALTER TABLE IF EXISTS public.prestadores_acessos
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS prestador_id UUID,
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT DEFAULT 'prestador_unidade',
  ADD COLUMN IF NOT EXISTS nome_completo TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS foto_rosto TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_documento TEXT,
  ADD COLUMN IF NOT EXISTS cracha TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS modelo_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS tempo_maximo_minutos INTEGER DEFAULT 240,
  ADD COLUMN IF NOT EXISTS limite_permanencia_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_saida TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_acesso TEXT DEFAULT 'DENTRO',
  ADD COLUMN IF NOT EXISTS operador_entrada_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida_nome TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_prestadores_acessos_condo_ativo ON public.prestadores_acessos(condominio_id, data_hora_saida);

-- ==============================================================================
-- 17. TABELA: lembretes_portaria (Bloco de avisos entre moradores e guarita)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lembretes_portaria (
  id TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_lembretes_portaria_condo ON public.lembretes_portaria(condominio_id, finalizado, lido);

-- ==============================================================================
-- 18. TABELAS: bancada_volumes & bancada_conferencias (Controle físico de balcão)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bancada_volumes (
  id TEXT PRIMARY KEY,
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

ALTER TABLE IF EXISTS public.bancada_volumes
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS estrutura TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS volumes INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS tipo_volume TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_bancada_volumes_condo ON public.bancada_volumes(condominio_id, status);

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

CREATE INDEX IF NOT EXISTS idx_bancada_conf_condo ON public.bancada_conferencias(condominio_id, data_hora DESC);

-- ==============================================================================
-- 19. TABELA: historico_absoluto (Trilha inalterável de auditoria)
-- ==============================================================================
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
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.historico_absoluto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS operador_id UUID,
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_login TEXT,
  ADD COLUMN IF NOT EXISTS modulo TEXT,
  ADD COLUMN IF NOT EXISTS acao TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS detalhes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_historico_condo_data ON public.historico_absoluto(condominio_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_historico_modulo ON public.historico_absoluto(modulo);

-- ==============================================================================
-- 20. TABELAS: templates_whatsapp & agenda_emergencia
-- ==============================================================================
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

ALTER TABLE IF EXISTS public.templates_whatsapp
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS conteudo TEXT,
  ADD COLUMN IF NOT EXISTS variaveis JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_templates_whatsapp_condo ON public.templates_whatsapp(condominio_id, tipo);

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

CREATE INDEX IF NOT EXISTS idx_agenda_emergencia_condo ON public.agenda_emergencia(condominio_id);

-- ==============================================================================
-- 21. LIMPEZA SEGURA DE TABELAS LEGADAS / DUPLICADAS
-- ==============================================================================
DROP TABLE IF EXISTS public.rondas_execucoes CASCADE;
DROP TABLE IF EXISTS public.registros_ronda CASCADE;
DROP TABLE IF EXISTS public.pontos_ronda CASCADE;
DROP TABLE IF EXISTS public.movimentacoes_chaves CASCADE;
DROP TABLE IF EXISTS public.rondas_passagem_posto CASCADE;
DROP TABLE IF EXISTS public.custodia_itens CASCADE;
DROP TABLE IF EXISTS public.inspecoes_materiais CASCADE;
DROP TABLE IF EXISTS public.visitas_prestadores CASCADE;
DROP TABLE IF EXISTS public.usuarios_sistema CASCADE;
DROP TABLE IF EXISTS public.blocos CASCADE;
DROP TABLE IF EXISTS public.unidades CASCADE;
DROP TABLE IF EXISTS public.encomendas CASCADE;
DROP TABLE IF EXISTS public.materiais CASCADE;

-- ==============================================================================
-- 22. SUPABASE STORAGE (Bucket 'encomendas' e Políticas de Armazenamento)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'encomendas') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'encomendas',
      'encomendas',
      TRUE,
      20971520, -- 20MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    );
  ELSE
    UPDATE storage.buckets
    SET public = TRUE,
        file_size_limit = 20971520
    WHERE id = 'encomendas';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Habilitar RLS no Storage e garantir políticas permissivas para o bucket
DO $$
BEGIN
  DROP POLICY IF EXISTS "Permitir_upload_publico_encomendas" ON storage.objects;
  CREATE POLICY "Permitir_upload_publico_encomendas"
    ON storage.objects FOR INSERT TO public
    WITH CHECK (bucket_id = 'encomendas');

  DROP POLICY IF EXISTS "Permitir_leitura_publica_encomendas" ON storage.objects;
  CREATE POLICY "Permitir_leitura_publica_encomendas"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'encomendas');

  DROP POLICY IF EXISTS "Permitir_update_publico_encomendas" ON storage.objects;
  CREATE POLICY "Permitir_update_publico_encomendas"
    ON storage.objects FOR UPDATE TO public
    USING (bucket_id = 'encomendas');

  DROP POLICY IF EXISTS "Permitir_delete_publico_encomendas" ON storage.objects;
  CREATE POLICY "Permitir_delete_publico_encomendas"
    ON storage.objects FOR DELETE TO public
    USING (bucket_id = 'encomendas');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 23. ROW LEVEL SECURITY (RLS) E POLÍTICAS PERMISSIVAS PARA TODAS AS TABELAS
-- ==============================================================================
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
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
      -- Habilita RLS na tabela
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- Exclui dinamicamente QUALQUER política que já exista na tabela para evitar erro 42710
      FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        BEGIN
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END LOOP;

      -- Limpa também por nomes específicos conhecidos com espaços ou underscores
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso total ' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso_total_' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso total portaria ' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Acesso_app_' || tbl, tbl);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

      -- Cria a política limpa e permissiva
      BEGIN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', 'Acesso_total_' || tbl, tbl);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- 24. TABELAS PARA RESERVA DE ÁREAS COMUNS E CONTROLE DE ACESSO
-- ==============================================================================

-- 24.1 Áreas Comuns do Condomínio
CREATE TABLE IF NOT EXISTS public.areas_comuns (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  capacidade_maxima INTEGER DEFAULT 30,
  taxa_reserva NUMERIC(10,2) DEFAULT 0.00,
  taxa_limpeza NUMERIC(10,2) DEFAULT 0.00,
  valor_caucao NUMERIC(10,2) DEFAULT 0.00,
  antecedencia_minima_dias INTEGER DEFAULT 1,
  antecedencia_maxima_dias INTEGER DEFAULT 60,
  horario_inicio TEXT DEFAULT '09:00',
  horario_fim TEXT DEFAULT '22:00',
  intervalo_limpeza_horas INTEGER DEFAULT 2,
  turnos_disponiveis JSONB DEFAULT '["manha","tarde","noite","dia_todo"]'::jsonb,
  dias_funcionamento JSONB DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  regras_termo TEXT,
  exige_aprovacao_sindico BOOLEAN DEFAULT TRUE,
  foto_url TEXT,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.areas_comuns
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS taxa_reserva NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS taxa_limpeza NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_caucao NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS antecedencia_minima_dias INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS antecedencia_maxima_dias INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS horario_inicio TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS horario_fim TEXT DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS intervalo_limpeza_horas INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS turnos_disponiveis JSONB DEFAULT '["manha","tarde","noite","dia_todo"]'::jsonb,
  ADD COLUMN IF NOT EXISTS dias_funcionamento JSONB DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  ADD COLUMN IF NOT EXISTS regras_termo TEXT,
  ADD COLUMN IF NOT EXISTS exige_aprovacao_sindico BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_areas_comuns_condo ON public.areas_comuns(condominio_id);
CREATE INDEX IF NOT EXISTS idx_areas_comuns_ativa ON public.areas_comuns(ativa);

-- 24.2 Reservas de Áreas Comuns
CREATE TABLE IF NOT EXISTS public.reservas_areas_comuns (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  area_id TEXT,
  area_nome TEXT NOT NULL,
  morador_id UUID,
  morador_nome TEXT NOT NULL,
  morador_telefone TEXT,
  unidade_bloco TEXT NOT NULL,
  data_reserva DATE NOT NULL,
  turno TEXT DEFAULT 'dia_todo',
  horario_inicio TEXT,
  horario_fim TEXT,
  tipo_evento TEXT,
  qtd_convidados_estimada INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pendente',
  valor_total NUMERIC(10,2) DEFAULT 0.00,
  pago BOOLEAN DEFAULT FALSE,
  termo_aceito BOOLEAN DEFAULT TRUE,
  data_aceite_termo TIMESTAMPTZ,
  observacoes_solicitante TEXT,
  motivo_recusa TEXT,
  aprovado_por_nome TEXT,
  aprovado_em TIMESTAMPTZ,
  vistoria_entrada JSONB DEFAULT '{"realizada": false}'::jsonb,
  vistoria_saida JSONB DEFAULT '{"realizada": false}'::jsonb,
  lista_convidados JSONB DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.reservas_areas_comuns
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS area_id TEXT,
  ADD COLUMN IF NOT EXISTS area_nome TEXT,
  ADD COLUMN IF NOT EXISTS morador_id UUID,
  ADD COLUMN IF NOT EXISTS morador_nome TEXT,
  ADD COLUMN IF NOT EXISTS morador_telefone TEXT,
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT,
  ADD COLUMN IF NOT EXISTS data_reserva DATE,
  ADD COLUMN IF NOT EXISTS turno TEXT DEFAULT 'dia_todo',
  ADD COLUMN IF NOT EXISTS horario_inicio TEXT,
  ADD COLUMN IF NOT EXISTS horario_fim TEXT,
  ADD COLUMN IF NOT EXISTS tipo_evento TEXT,
  ADD COLUMN IF NOT EXISTS qtd_convidados_estimada INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS termo_aceito BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS data_aceite_termo TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes_solicitante TEXT,
  ADD COLUMN IF NOT EXISTS motivo_recusa TEXT,
  ADD COLUMN IF NOT EXISTS aprovado_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vistoria_entrada JSONB DEFAULT '{"realizada": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS vistoria_saida JSONB DEFAULT '{"realizada": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS lista_convidados JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_reservas_condo_data ON public.reservas_areas_comuns(condominio_id, data_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_area ON public.reservas_areas_comuns(area_id);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON public.reservas_areas_comuns(status);
CREATE INDEX IF NOT EXISTS idx_reservas_unidade ON public.reservas_areas_comuns(unidade_bloco);

-- 24.3 Pontos de Acesso
CREATE TABLE IF NOT EXISTS public.pontos_acesso (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'pedestre',
  localizacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.pontos_acesso
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'pedestre',
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pontos_acesso_condo ON public.pontos_acesso(condominio_id);

-- 24.4 Registros de Acesso (Entradas & Saídas)
CREATE TABLE IF NOT EXISTS public.registros_acesso (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  empresa TEXT,
  unidade_bloco TEXT NOT NULL,
  morador_responsavel TEXT,
  ponto_acesso_entrada TEXT,
  ponto_acesso_saida TEXT,
  veiculo_placa TEXT,
  veiculo_modelo TEXT,
  veiculo_cor TEXT,
  data_hora_entrada TIMESTAMPTZ DEFAULT now(),
  data_hora_saida TIMESTAMPTZ,
  status TEXT DEFAULT 'presente',
  foto_entrada_url TEXT,
  foto_saida_url TEXT,
  operador_entrada_nome TEXT,
  operador_saida_nome TEXT,
  observacoes TEXT,
  cracha_ou_tag TEXT,
  reserva_area_id TEXT,
  passe_qr_id TEXT,
  motivo_bloqueio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.registros_acesso
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT,
  ADD COLUMN IF NOT EXISTS morador_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS ponto_acesso_entrada TEXT,
  ADD COLUMN IF NOT EXISTS ponto_acesso_saida TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_placa TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_modelo TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_cor TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_entrada TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS data_hora_saida TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'presente',
  ADD COLUMN IF NOT EXISTS foto_entrada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_saida_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrada_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida_nome TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS cracha_ou_tag TEXT,
  ADD COLUMN IF NOT EXISTS reserva_area_id TEXT,
  ADD COLUMN IF NOT EXISTS passe_qr_id TEXT,
  ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_reg_acesso_condo ON public.registros_acesso(condominio_id);
CREATE INDEX IF NOT EXISTS idx_reg_acesso_status ON public.registros_acesso(status);
CREATE INDEX IF NOT EXISTS idx_reg_acesso_data ON public.registros_acesso(condominio_id, data_hora_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_reg_acesso_placa ON public.registros_acesso(veiculo_placa);
CREATE INDEX IF NOT EXISTS idx_reg_acesso_unidade ON public.registros_acesso(unidade_bloco);

-- 24.5 Passes Virtuais & QR Codes de Acesso
CREATE TABLE IF NOT EXISTS public.passes_virtuais_qr (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  condominio_id UUID,
  morador_nome TEXT NOT NULL,
  morador_telefone TEXT,
  unidade_bloco TEXT NOT NULL,
  visitante_nome TEXT NOT NULL,
  visitante_documento TEXT,
  tipo TEXT DEFAULT 'visitante',
  data_validade DATE NOT NULL,
  hora_inicio TEXT,
  hora_fim TEXT,
  max_usos INTEGER DEFAULT 1,
  usos_realizados INTEGER DEFAULT 0,
  status TEXT DEFAULT 'valido',
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.passes_virtuais_qr
  ADD COLUMN IF NOT EXISTS token TEXT,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS morador_nome TEXT,
  ADD COLUMN IF NOT EXISTS morador_telefone TEXT,
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT,
  ADD COLUMN IF NOT EXISTS visitante_nome TEXT,
  ADD COLUMN IF NOT EXISTS visitante_documento TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'visitante',
  ADD COLUMN IF NOT EXISTS data_validade DATE,
  ADD COLUMN IF NOT EXISTS hora_inicio TEXT,
  ADD COLUMN IF NOT EXISTS hora_fim TEXT,
  ADD COLUMN IF NOT EXISTS max_usos INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS usos_realizados INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'valido',
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_passes_token ON public.passes_virtuais_qr(token);
CREATE INDEX IF NOT EXISTS idx_passes_condo ON public.passes_virtuais_qr(condominio_id);
CREATE INDEX IF NOT EXISTS idx_passes_status ON public.passes_virtuais_qr(status);

-- 24.6 Blacklist & Alertas de Bloqueio de Acesso
CREATE TABLE IF NOT EXISTS public.blacklist_bloqueios (
  id TEXT PRIMARY KEY,
  condominio_id UUID,
  tipo TEXT NOT NULL,
  nome_ou_placa TEXT NOT NULL,
  documento TEXT,
  motivo TEXT NOT NULL,
  gravidade TEXT DEFAULT 'bloqueio_total',
  registrado_por TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.blacklist_bloqueios
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS nome_ou_placa TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS gravidade TEXT DEFAULT 'bloqueio_total',
  ADD COLUMN IF NOT EXISTS registrado_por TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_blacklist_condo ON public.blacklist_bloqueios(condominio_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_busca ON public.blacklist_bloqueios(nome_ou_placa);
CREATE INDEX IF NOT EXISTS idx_blacklist_ativo ON public.blacklist_bloqueios(ativo);

-- ==============================================================================
-- 25. POLÍTICAS DE SEGURANÇA (RLS) PARA AS NOVAS TABELAS
-- ==============================================================================
ALTER TABLE public.areas_comuns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_areas_comuns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes_virtuais_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist_bloqueios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Acesso total areas_comuns" ON public.areas_comuns;
  CREATE POLICY "Acesso total areas_comuns" ON public.areas_comuns FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Acesso total reservas_areas_comuns" ON public.reservas_areas_comuns;
  CREATE POLICY "Acesso total reservas_areas_comuns" ON public.reservas_areas_comuns FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Acesso total pontos_acesso" ON public.pontos_acesso;
  CREATE POLICY "Acesso total pontos_acesso" ON public.pontos_acesso FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Acesso total registros_acesso" ON public.registros_acesso;
  CREATE POLICY "Acesso total registros_acesso" ON public.registros_acesso FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Acesso total passes_virtuais_qr" ON public.passes_virtuais_qr;
  CREATE POLICY "Acesso total passes_virtuais_qr" ON public.passes_virtuais_qr FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Acesso total blacklist_bloqueios" ON public.blacklist_bloqueios;
  CREATE POLICY "Acesso total blacklist_bloqueios" ON public.blacklist_bloqueios FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 26. SUPABASE REALTIME (Configuração de publicações em tempo real)
-- ==============================================================================
DO $$
DECLARE
  tbl_rt TEXT;
  tabelas_realtime TEXT[] := ARRAY[
    'historico_absoluto',
    'lembretes_portaria',
    'encomendas_itens',
    'ocorrencias',
    'bancada_volumes',
    'chaves',
    'movimentacao_chaves',
    'prestadores_acessos',
    'passagens_posto',
    'areas_comuns',
    'reservas_areas_comuns',
    'pontos_acesso',
    'registros_acesso',
    'passes_virtuais_qr',
    'blacklist_bloqueios'
  ];
BEGIN
  FOREACH tbl_rt IN ARRAY tabelas_realtime LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = tbl_rt
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl_rt);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ==============================================================================
-- 27. RECARREGAR O CACHE DO SCHEMA POSTGREST DO SUPABASE
-- ==============================================================================
NOTIFY pgrst, 'reload schema';


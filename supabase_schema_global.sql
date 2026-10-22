-- ==============================================================================
-- PORTTOHUB 1.0 - SCRIPT SQL COMPLETO DE CRIAÇÃO DO BANCO SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/kkeizhscivyfjgetnbke/sql/new
--
-- O que este script faz:
-- 1. Cria ou garante todas as 25 tabelas oficiais do INFPORT 1.0.
-- 2. Adiciona todas as colunas novas requeridas (RBAC, Chaves, Custódia, Manutenção, Rondas, etc).
-- 3. Garante constraint UNIQUE em configuracoes(condominio_id) para salvar preferências.
-- 4. Habilita Row Level Security (RLS) permissivo com políticas de acesso total para a portaria.
-- 5. Garante o Bucket de Armazenamento 'encomendas' para fotos e comprovantes.
-- 6. Recarrega o cache do PostgREST imediatamente (NOTIFY pgrst, 'reload schema').
-- ==============================================================================

BEGIN;

-- 1. EXTENSÕES BÁSICAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: condominios (Cadastro Multi-Tenant e Estrutura Física)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT DEFAULT 'São Paulo',
  uf TEXT DEFAULT 'SP',
  telefone_portaria TEXT,
  sindico_nome TEXT,
  sindico_whatsapp TEXT,
  whatsapp_grupo_url TEXT,
  escala_plantao TEXT DEFAULT '06_18',
  horario_diurno_inicio TEXT DEFAULT '06:00',
  horario_noturno_inicio TEXT DEFAULT '18:00',
  intervalo_ronda INTEGER DEFAULT 15,
  tipo_estrutura TEXT DEFAULT 'casas',
  qtd_blocos INTEGER DEFAULT 1,
  unidades_por_bloco INTEGER DEFAULT 117,
  nomes_blocos TEXT,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT DEFAULT 'São Paulo',
  ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT 'SP',
  ADD COLUMN IF NOT EXISTS telefone_portaria TEXT,
  ADD COLUMN IF NOT EXISTS sindico_nome TEXT,
  ADD COLUMN IF NOT EXISTS sindico_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_url TEXT,
  ADD COLUMN IF NOT EXISTS escala_plantao TEXT DEFAULT '06_18',
  ADD COLUMN IF NOT EXISTS horario_diurno_inicio TEXT DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS horario_noturno_inicio TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS intervalo_ronda INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS tipo_estrutura TEXT DEFAULT 'casas',
  ADD COLUMN IF NOT EXISTS qtd_blocos INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unidades_por_bloco INTEGER DEFAULT 117,
  ADD COLUMN IF NOT EXISTS nomes_blocos TEXT,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 3. TABELA: configuracoes (Feature Flags, Locais e Gestão RBAC de Níveis de Acesso)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  niveis_acesso JSONB DEFAULT '[]'::jsonb,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  setores_ronda JSONB DEFAULT '[]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  dados_tenant JSONB DEFAULT '{}'::jsonb,
  mod02_gestao_encomendas BOOLEAN DEFAULT true,
  mod03_custodia_itens BOOLEAN DEFAULT true,
  mod04_materiais_posto BOOLEAN DEFAULT true,
  mod05_quadro_chaves BOOLEAN DEFAULT true,
  mod06_gestao_manutencao BOOLEAN DEFAULT true,
  mod07_gestao_ronda BOOLEAN DEFAULT true,
  mod08_livro_ocorrencias BOOLEAN DEFAULT true,
  mod09_passagem_posto BOOLEAN DEFAULT true,
  mod10_prestadores_servico BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS niveis_acesso JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS setores_ronda JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dados_tenant JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mod02_gestao_encomendas BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod03_custodia_itens BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod04_materiais_posto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod05_quadro_chaves BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod06_gestao_manutencao BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod07_gestao_ronda BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod08_livro_ocorrencias BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod09_passagem_posto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod10_prestadores_servico BOOLEAN DEFAULT true;

-- Garante constraint UNIQUE em condominio_id para upserts funcionarem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_condominio_id_key'
  ) THEN
    ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_condominio_id_key UNIQUE (condominio_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 4. TABELA: operadores (Porteiros, Supervisores, Síndicos, Administradores)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  login TEXT NOT NULL,
  senha TEXT,
  funcao TEXT DEFAULT 'Porteiro',
  telefone TEXT,
  turno_padrao TEXT DEFAULT 'Diurno',
  nivel_acesso INTEGER DEFAULT 3,
  nivel_acesso_custom_id TEXT DEFAULT 'nivel_3',
  perfil TEXT DEFAULT 'operador',
  foto_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE operadores
  ADD COLUMN IF NOT EXISTS nivel_acesso INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS nivel_acesso_custom_id TEXT DEFAULT 'nivel_3',
  ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'operador',
  ADD COLUMN IF NOT EXISTS funcao TEXT DEFAULT 'Porteiro',
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS turno_padrao TEXT DEFAULT 'Diurno',
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- ==============================================================================
-- 5. TABELA: moradores (Moradores, Inquilinos, Proprietários)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tipo TEXT DEFAULT 'Morador',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE moradores
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ==============================================================================
-- 6. TABELA: entregadores & lotes_re & encomendas_itens
-- ==============================================================================
CREATE TABLE IF NOT EXISTS entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lotes_re (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_re TEXT NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  entregador_id UUID REFERENCES entregadores(id) ON DELETE SET NULL,
  qtd_declarada INTEGER DEFAULT 1,
  qtd_triada INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aguardando_triagem',
  operador_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_key;
ALTER TABLE lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_unique;

CREATE TABLE IF NOT EXISTS encomendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_re_id UUID REFERENCES lotes_re(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  bloco TEXT,
  unidade TEXT NOT NULL,
  morador_id UUID REFERENCES moradores(id) ON DELETE SET NULL,
  codigo_barras TEXT,
  foto_etiqueta_url TEXT,
  observacoes TEXT,
  local_armazenamento TEXT DEFAULT 'Bancada Principal',
  status TEXT DEFAULT 'retido',
  retirado_por TEXT,
  foto_retirada_url TEXT,
  foto_comprovante_url TEXT,
  data_retirada TIMESTAMPTZ,
  data_hora_retirada TIMESTAMPTZ,
  operador_baixa_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE encomendas_itens
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Bancada Principal',
  ADD COLUMN IF NOT EXISTS retirado_por TEXT,
  ADD COLUMN IF NOT EXISTS foto_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_comprovante_url TEXT,
  ADD COLUMN IF NOT EXISTS data_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operador_baixa_id TEXT;

-- ==============================================================================
-- 7. TABELA: locais_armazenamento
-- ==============================================================================
CREATE TABLE IF NOT EXISTS locais_armazenamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Prateleira',
  capacidade TEXT,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABELA: custodia (Guarda e Retirada de Pertences)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS custodia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_custodia TEXT,
  fluxo TEXT DEFAULT 'ENTRADA',
  origem_tipo TEXT DEFAULT 'Morador',
  origem_unidade TEXT,
  origem_bloco TEXT,
  origem_nome_doc TEXT,
  origem_whats TEXT,
  destino_tipo TEXT DEFAULT 'Morador',
  destino_unidade TEXT,
  destino_bloco TEXT,
  destino_nome_doc TEXT,
  destino_whats TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'Pertence / Objeto',
  foto_entrada_url TEXT,
  foto_url TEXT,
  status TEXT DEFAULT 'Aguardando Retirada',
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  operador_entrada TEXT,
  recebedor_nome TEXT,
  recebedor_doc TEXT,
  foto_saida_url TEXT,
  operador_saida TEXT,
  data_hora_saida TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custodia
  ADD COLUMN IF NOT EXISTS codigo_custodia TEXT,
  ADD COLUMN IF NOT EXISTS fluxo TEXT DEFAULT 'ENTRADA',
  ADD COLUMN IF NOT EXISTS origem_tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS origem_unidade TEXT,
  ADD COLUMN IF NOT EXISTS origem_bloco TEXT,
  ADD COLUMN IF NOT EXISTS origem_nome_doc TEXT,
  ADD COLUMN IF NOT EXISTS origem_whats TEXT,
  ADD COLUMN IF NOT EXISTS destino_tipo TEXT DEFAULT 'Morador',
  ADD COLUMN IF NOT EXISTS destino_unidade TEXT,
  ADD COLUMN IF NOT EXISTS destino_bloco TEXT,
  ADD COLUMN IF NOT EXISTS destino_nome_doc TEXT,
  ADD COLUMN IF NOT EXISTS destino_whats TEXT,
  ADD COLUMN IF NOT EXISTS foto_entrada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrada TEXT,
  ADD COLUMN IF NOT EXISTS recebedor_nome TEXT,
  ADD COLUMN IF NOT EXISTS recebedor_doc TEXT,
  ADD COLUMN IF NOT EXISTS foto_saida_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_saida TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ==============================================================================
-- 9. TABELA: materiais_posto (Inventário dos Equipamentos do Posto)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS materiais_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Equipamento',
  codigo_patrimonio TEXT,
  estado TEXT DEFAULT 'Perfeito',
  observacao_avaria TEXT,
  foto_avaria_url TEXT,
  operador_atualizacao TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE materiais_posto
  ADD COLUMN IF NOT EXISTS operador_atualizacao TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 10. TABELA: chaves & movimentacao_chaves
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_chave TEXT NOT NULL,
  nome_chave TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT,
  tempo_limite_horas INTEGER DEFAULT 2,
  status TEXT DEFAULT 'Disponível',
  identificacao_sala TEXT,
  setor TEXT DEFAULT 'Área Comum',
  posse_atual TEXT,
  contato_posse TEXT,
  retirado_as TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chaves
  ADD COLUMN IF NOT EXISTS nome_chave TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS tempo_limite_horas INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Disponível';

CREATE TABLE IF NOT EXISTS movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  chave_id UUID REFERENCES chaves(id) ON DELETE CASCADE,
  retirante_nome TEXT NOT NULL,
  retirante_doc TEXT,
  retirante_telefone TEXT,
  foto_retirada_url TEXT,
  data_hora_retirada TIMESTAMPTZ DEFAULT NOW(),
  previsao_devolucao TIMESTAMPTZ,
  status TEXT DEFAULT 'Em Andamento',
  operador_retirada TEXT,
  data_hora_devolucao TIMESTAMPTZ,
  foto_devolucao_url TEXT,
  operador_devolucao TEXT,
  tipo_movimento TEXT,
  responsavel_nome TEXT,
  responsavel_doc TEXT,
  data_hora TIMESTAMPTZ,
  operador_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE movimentacao_chaves
  ADD COLUMN IF NOT EXISTS retirante_nome TEXT,
  ADD COLUMN IF NOT EXISTS retirante_doc TEXT,
  ADD COLUMN IF NOT EXISTS retirante_telefone TEXT,
  ADD COLUMN IF NOT EXISTS foto_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS previsao_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Em Andamento',
  ADD COLUMN IF NOT EXISTS operador_retirada TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS foto_devolucao_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_devolucao TEXT;

-- ==============================================================================
-- 11. TABELAS: chamados_manutencao & checklist_manutencao
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chamados_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  localizacao TEXT,
  categoria TEXT DEFAULT 'Geral',
  prioridade TEXT DEFAULT 'Média',
  descricao TEXT,
  foto_antes_url TEXT,
  status TEXT DEFAULT 'Aberto',
  operador_abertura TEXT,
  observacao_conclusao TEXT,
  foto_depois_url TEXT,
  operador_conclusao TEXT,
  data_conclusao TIMESTAMPTZ,
  solicitante TEXT,
  local_especifico TEXT,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chamados_manutencao
  ADD COLUMN IF NOT EXISTS localizacao TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS operador_abertura TEXT,
  ADD COLUMN IF NOT EXISTS observacao_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS foto_depois_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS solicitante TEXT,
  ADD COLUMN IF NOT EXISTS local_especifico TEXT,
  ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS checklist_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  periodicidade TEXT DEFAULT 'Diário',
  frequencia TEXT DEFAULT 'Diário',
  prioridade TEXT DEFAULT 'Média',
  status TEXT DEFAULT 'Pendente',
  operador_criacao TEXT,
  observacao_execucao TEXT,
  foto_url TEXT,
  operador_conclusao TEXT,
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checklist_manutencao
  ADD COLUMN IF NOT EXISTS periodicidade TEXT DEFAULT 'Diário',
  ADD COLUMN IF NOT EXISTS frequencia TEXT DEFAULT 'Diário',
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS operador_criacao TEXT,
  ADD COLUMN IF NOT EXISTS observacao_execucao TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS operador_conclusao TEXT,
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ;

-- ==============================================================================
-- 12. TABELAS: rondas_setores, rondas_pontos, rondas_execucao, rondas_registros
-- ==============================================================================
CREATE TABLE IF NOT EXISTS rondas_setores (
  id TEXT NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  itens JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, condominio_id)
);

CREATE TABLE IF NOT EXISTS rondas_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome_ponto TEXT NOT NULL,
  codigo_tag TEXT NOT NULL,
  localizacao_descricao TEXT,
  setor_id TEXT DEFAULT 'Geral',
  latitude NUMERIC,
  longitude NUMERIC,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rondas_pontos
  ADD COLUMN IF NOT EXISTS setor_id TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS rondas_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  operador_nome TEXT NOT NULL,
  status TEXT DEFAULT 'Em Andamento',
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  pontos_totais INTEGER DEFAULT 0,
  pontos_lidos INTEGER DEFAULT 0,
  resumo_detalhado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rondas_execucao
  ADD COLUMN IF NOT EXISTS pontos_totais INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pontos_lidos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resumo_detalhado TEXT;

CREATE TABLE IF NOT EXISTS rondas_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ronda_id UUID REFERENCES rondas_execucao(id) ON DELETE CASCADE,
  ponto_id UUID REFERENCES rondas_pontos(id) ON DELETE CASCADE,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  latitude NUMERIC,
  longitude NUMERIC,
  foto_evidencia_url TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. TABELA: passagens_posto
-- ==============================================================================
CREATE TABLE IF NOT EXISTS passagens_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  operador_sainte_nome TEXT NOT NULL,
  operador_entrante_nome TEXT NOT NULL,
  checklist JSONB DEFAULT '{}'::jsonb,
  pendencias JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  divergencia TEXT,
  status TEXT DEFAULT 'Concluída',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE passagens_posto
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pendencias JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS divergencia TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Concluída',
  ADD COLUMN IF NOT EXISTS operador_sainte_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_entrante_nome TEXT,
  ADD COLUMN IF NOT EXISTS condominio_nome TEXT;

-- ==============================================================================
-- 14. TABELA: ocorrencias (Livro Digital de Ocorrências)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT DEFAULT 'Interna',
  prioridade TEXT DEFAULT 'Média',
  status TEXT DEFAULT 'Pendente',
  foto_url TEXT,
  operador_nome TEXT,
  unidade_bloco TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ocorrencias
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Interna',
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS unidade_bloco TEXT;

-- ==============================================================================
-- 15. TABELAS: prestadores & prestadores_acessos
-- ==============================================================================
CREATE TABLE IF NOT EXISTS prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  perfil_acesso TEXT DEFAULT 'prestador_unidade',
  nome_profissional TEXT,
  nome_completo TEXT,
  documento TEXT,
  tipo_documento TEXT DEFAULT 'CPF',
  empresa TEXT,
  parentesco_vinculo TEXT,
  telefone TEXT,
  placa_veiculo TEXT,
  foto_rosto TEXT,
  foto_documento TEXT,
  tipo_servico TEXT,
  atende_condominio BOOLEAN DEFAULT false,
  unidade TEXT,
  bloco TEXT,
  observacoes TEXT,
  tipo_validade TEXT DEFAULT 'hoje',
  data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_validade_fim TIMESTAMPTZ,
  status_acesso TEXT DEFAULT 'AUTORIZADO',
  operador_entrada_nome TEXT,
  data_hora_entrada TIMESTAMPTZ,
  data_hora_saida TIMESTAMPTZ,
  cracha_atribuido TEXT,
  tempo_maximo_minutos INTEGER DEFAULT 240,
  limite_permanencia_ate TIMESTAMPTZ,
  operador_saida_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  ADD COLUMN IF NOT EXISTS operador_saida_nome TEXT,
  ADD COLUMN IF NOT EXISTS foto_documento TEXT,
  ADD COLUMN IF NOT EXISTS foto_rosto TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'CPF',
  ADD COLUMN IF NOT EXISTS cracha_atribuido TEXT;

CREATE TABLE IF NOT EXISTS prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ==============================================================================
-- 16. TABELAS: templates_whatsapp & agenda_emergencia
-- ==============================================================================
CREATE TABLE IF NOT EXISTS templates_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_evento TEXT NOT NULL,
  canal_destino TEXT DEFAULT 'Morador Direct',
  corpo_texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_emergencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  categoria TEXT DEFAULT 'Órgão Público',
  nome_descricao TEXT NOT NULL,
  telefone_principal TEXT NOT NULL,
  telefone_whatsapp TEXT,
  exibir_menu_flutuante BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 17. TABELA: historico_absoluto (Auditoria Global do Sistema em Tempo Real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS historico_absoluto (
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
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 18. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_condominios_nome ON condominios(nome);
CREATE INDEX IF NOT EXISTS idx_operadores_condominio ON operadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_operadores_login ON operadores(login);
CREATE INDEX IF NOT EXISTS idx_moradores_condominio ON moradores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_moradores_unidade ON moradores(condominio_id, unidade);
CREATE INDEX IF NOT EXISTS idx_lotes_re_condominio ON lotes_re(condominio_id);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_condominio ON encomendas_itens(condominio_id);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_status ON encomendas_itens(status);
CREATE INDEX IF NOT EXISTS idx_chaves_condominio ON chaves(condominio_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_chaves_condominio ON movimentacao_chaves(condominio_id);
CREATE INDEX IF NOT EXISTS idx_custodia_condominio ON custodia(condominio_id);
CREATE INDEX IF NOT EXISTS idx_materiais_condominio ON materiais_posto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_chamados_condominio ON chamados_manutencao(condominio_id);
CREATE INDEX IF NOT EXISTS idx_checklist_condominio ON checklist_manutencao(condominio_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_condominio ON ocorrencias(condominio_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_condominio ON prestadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_acessos_condominio ON prestadores_acessos(condominio_id);
CREATE INDEX IF NOT EXISTS idx_hist_abs_condominio ON historico_absoluto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_hist_abs_modulo ON historico_absoluto(modulo);
CREATE INDEX IF NOT EXISTS idx_hist_abs_criado_em ON historico_absoluto(criado_em DESC);

-- ==============================================================================
-- 19. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) E POLÍTICAS PERMISSIVAS
-- ==============================================================================
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_re ENABLE ROW LEVEL SECURITY;
ALTER TABLE encomendas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais_armazenamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodia ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais_posto ENABLE ROW LEVEL SECURITY;
ALTER TABLE chaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_chaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamados_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_execucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE passagens_posto ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestadores_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_emergencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_absoluto ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total portaria %I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('CREATE POLICY "Acesso total portaria %I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl.table_name, tbl.table_name);
  END LOOP;
END $$;

-- ==============================================================================
-- 20. BUCKET DE ARMAZENAMENTO PARA FOTOS (encomendas, chaves, comprovantes)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('encomendas', 'encomendas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Storage Encomendas" ON storage.objects;
  CREATE POLICY "Public Storage Encomendas" ON storage.objects
    FOR ALL USING (bucket_id = 'encomendas') WITH CHECK (bucket_id = 'encomendas');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 21. DADOS INICIAIS SEED (Garante Condomínio Padrão e Usuário Admin)
-- ==============================================================================
-- Garante o condomínio padrão 'aa205bfb-55cc-42fe-ab25-9c16ac943851' se tabela estiver vazia
INSERT INTO condominios (id, nome, endereco, tipo_estrutura, qtd_blocos, unidades_por_bloco)
VALUES (
  'aa205bfb-55cc-42fe-ab25-9c16ac943851',
  'Residencial Parque das Flores',
  'Av. Principal, 1000',
  'casas',
  1,
  117
)
ON CONFLICT (id) DO NOTHING;

-- Garante configuração inicial para o condomínio padrão
INSERT INTO configuracoes (condominio_id, feature_flags, niveis_acesso)
VALUES (
  'aa205bfb-55cc-42fe-ab25-9c16ac943851',
  '{"mod02_gestao_encomendas":true,"mod03_custodia_itens":true,"mod04_materiais_posto":true,"mod05_quadro_chaves":true,"mod06_gestao_manutencao":true,"mod07_gestao_ronda":true,"mod08_livro_ocorrencias":true,"mod09_passagem_posto":true,"mod10_prestadores_servico":true}'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (condominio_id) DO NOTHING;

-- Garante operador Administrador Geral inicial (admin / admin123)
INSERT INTO operadores (condominio_id, nome, login, senha, nivel_acesso, nivel_acesso_custom_id, perfil, funcao, ativo)
SELECT 
  'aa205bfb-55cc-42fe-ab25-9c16ac943851',
  'Administrador Geral',
  'admin',
  'admin123',
  0,
  'nivel_0',
  'admin',
  'Administrador',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM operadores WHERE login = 'admin'
);

-- ==============================================================================
-- 21. TABELAS DO MÓDULO 11: BANCADA DE PORTARIA & BALCÃO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bancada_volumes (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  estrutura TEXT NOT NULL DEFAULT 'Geral',
  unidade TEXT NOT NULL DEFAULT '00',
  volumes INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  tipo_volume TEXT DEFAULT 'Volume',
  operador_nome TEXT,
  operador_id TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bancada_volumes
  ADD COLUMN IF NOT EXISTS estrutura TEXT NOT NULL DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS unidade TEXT NOT NULL DEFAULT '00',
  ADD COLUMN IF NOT EXISTS volumes INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS tipo_volume TEXT DEFAULT 'Volume',
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS bancada_conferencias (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  operador_nome TEXT NOT NULL,
  operador_id TEXT,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_volumes INTEGER NOT NULL DEFAULT 0,
  total_unidades INTEGER NOT NULL DEFAULT 0,
  estruturas_resumo JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS mod01_cadastros_base BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod11_bancada_conferencia BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod12_historico_absoluto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod_portal_sindico BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_bancada_volumes_condominio ON bancada_volumes(condominio_id);
CREATE INDEX IF NOT EXISTS idx_bancada_volumes_status ON bancada_volumes(status);
CREATE INDEX IF NOT EXISTS idx_bancada_volumes_estrutura_unidade ON bancada_volumes(condominio_id, estrutura, unidade);
CREATE INDEX IF NOT EXISTS idx_bancada_conferencias_condominio ON bancada_conferencias(condominio_id);
CREATE INDEX IF NOT EXISTS idx_bancada_conferencias_data_hora ON bancada_conferencias(data_hora DESC);

ALTER TABLE bancada_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancada_conferencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total bancada_volumes" ON bancada_volumes;
CREATE POLICY "Acesso total bancada_volumes" ON bancada_volumes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total bancada_conferencias" ON bancada_conferencias;
CREATE POLICY "Acesso total bancada_conferencias" ON bancada_conferencias FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 22. REALTIME & RECARREGAR O SCHEMA CACHE DO POSTGREST
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'historico_absoluto'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE historico_absoluto;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'bancada_volumes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bancada_volumes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'bancada_conferencias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bancada_conferencias;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'lembretes_portaria'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lembretes_portaria;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- TABELA: lembretes_portaria (Mensagens e Recados Portaria ⇄ Moradores)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lembretes_portaria (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  unidade_bloco TEXT NOT NULL,
  remetente_tipo TEXT NOT NULL DEFAULT 'morador',
  remetente_nome TEXT,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Aviso Geral',
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  lido_em TIMESTAMPTZ,
  lido_por_nome TEXT,
  lido_por_id TEXT,
  finalizado BOOLEAN NOT NULL DEFAULT FALSE,
  finalizado_em TIMESTAMPTZ,
  finalizado_por_nome TEXT,
  finalizado_por_id TEXT,
  eh_adm BOOLEAN NOT NULL DEFAULT FALSE,
  data_limite TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lembretes_condominio ON lembretes_portaria(condominio_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_condominio_lido ON lembretes_portaria(condominio_id, lido, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lembretes_condominio_created ON lembretes_portaria(condominio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lembretes_unidade ON lembretes_portaria(condominio_id, unidade_bloco);
CREATE INDEX IF NOT EXISTS idx_lembretes_lido ON lembretes_portaria(lido);

ALTER TABLE lembretes_portaria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total lembretes_portaria" ON lembretes_portaria;
CREATE POLICY "Acesso total lembretes_portaria" ON lembretes_portaria FOR ALL USING (true) WITH CHECK (true);

COMMIT;

-- Recarrega o cache do PostgREST imediatamente para aplicar as novas colunas
NOTIFY pgrst, 'reload schema';



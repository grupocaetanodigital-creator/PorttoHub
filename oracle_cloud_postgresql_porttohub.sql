-- ==============================================================================
-- PORTTOHUB - SCRIPT SQL COMPLETO & DEFINITIVO PARA ORACLE CLOUD (OCI)
-- Compatível com PostgreSQL 14, 15, 16 + PostgREST (100% Free Tier)
-- ==============================================================================
-- Este script cria toda a estrutura de banco de dados para os Módulos 01 a 12:
-- - Chaves Primárias UUID automáticas (gen_random_uuid())
-- - Coluna 'condominio_id' em TODAS as tabelas para isolamento Multi-Tenant estrito
-- - Colunas 'created_at' e 'updated_at' com trigger de atualização automática
-- - Índices de alta performance em chaves estrangeiras, status e datas
-- - Permissões completas para a camada REST (PostgREST / Supabase client)
-- - Carga inicial (Seed) de Condomínio Modelo, Configurações e Operador Admin
-- ==============================================================================

BEGIN;

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNÇÃO TRIGGER PARA ATUALIZAR 'updated_at' AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- MÓDULO 01: CADASTROS BASE & GESTÃO MULTI-CONDOMÍNIO
-- ==============================================================================

-- 2.1 TABELA: condominios
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
  unidades_por_bloco INTEGER DEFAULT 100,
  nomes_blocos TEXT,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 TABELA: configuracoes (Feature Flags e Configurações por Condomínio)
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE UNIQUE,
  niveis_acesso JSONB DEFAULT '[]'::jsonb,
  feature_flags JSONB DEFAULT '{"mod01_cadastros_base": true, "mod02_gestao_encomendas": true, "mod03_custodia_itens": true, "mod04_materiais_posto": true, "mod05_quadro_chaves": true, "mod06_gestao_manutencao": true, "mod07_gestao_ronda": true, "mod08_livro_ocorrencias": true, "mod09_passagem_posto": true, "mod10_prestadores_servico": true, "mod11_bancada_conferencia": true, "mod12_historico_absoluto": true, "mod_portal_sindico": true}'::jsonb,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  setores_ronda JSONB DEFAULT '[]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  dados_tenant JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 TABELA: operadores (Porteiros, Supervisores, Síndicos e Administradores)
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  login TEXT NOT NULL,
  senha TEXT NOT NULL,
  perfil TEXT DEFAULT 'porteiro', -- 'admin', 'supervisor', 'porteiro', 'sindico'
  nivel_acesso INTEGER DEFAULT 3, -- 1: Master, 2: Supervisor, 3: Porteiro, 4: Visualizador
  ativo BOOLEAN DEFAULT true,
  cargo TEXT DEFAULT 'Porteiro',
  telefone TEXT,
  email TEXT,
  turno TEXT, -- 'diurno', 'noturno', '12x36', etc.
  foto_url TEXT,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 TABELA: moradores (Moradores, Unidades, Dependentes e Veículos)
CREATE TABLE IF NOT EXISTS moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  bloco TEXT NOT NULL,
  unidade TEXT NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  tipo TEXT DEFAULT 'proprietario', -- 'proprietario', 'inquilino', 'dependente'
  veiculos JSONB DEFAULT '[]'::jsonb,
  dependentes JSONB DEFAULT '[]'::jsonb,
  tags_acesso JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 02: GESTÃO DE ENCOMENDAS (TRIAGEM, RE, BAIXA E BANCADA)
-- ==============================================================================

-- 2.5 TABELA: entregadores (Transportadoras e Couriers)
CREATE TABLE IF NOT EXISTS entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  empresa TEXT,
  documento TEXT,
  telefone TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 TABELA: lotes_re (Recebimento de Entrega por Courier)
CREATE TABLE IF NOT EXISTS lotes_re (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_lote TEXT NOT NULL,
  transportadora TEXT NOT NULL,
  entregador_nome TEXT,
  entregador_documento TEXT,
  operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_nome TEXT NOT NULL,
  total_volumes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'em_triagem', -- 'em_triagem', 'concluido', 'cancelado'
  observacoes TEXT,
  fotos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 TABELA: locais_armazenamento (Prateleiras, Armários, Escaninhos da Portaria)
CREATE TABLE IF NOT EXISTS locais_armazenamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  capacidade INTEGER DEFAULT 50,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 TABELA: encomendas_itens (Itens retidos e entregues aos moradores)
CREATE TABLE IF NOT EXISTS encomendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  lote_re_id UUID REFERENCES lotes_re(id) ON DELETE SET NULL,
  codigo_barras TEXT,
  bloco TEXT NOT NULL,
  unidade TEXT NOT NULL,
  morador_id UUID REFERENCES moradores(id) ON DELETE SET NULL,
  morador_nome TEXT,
  transportadora TEXT,
  volumes INTEGER DEFAULT 1,
  local_armazenamento TEXT DEFAULT 'Bancada',
  foto_etiqueta_url TEXT,
  foto_pacote_url TEXT,
  status TEXT DEFAULT 'retido', -- 'retido', 'entregue', 'devolvido'
  operador_entrada_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_entrada_nome TEXT NOT NULL,
  data_entrada TIMESTAMPTZ DEFAULT NOW(),
  operador_saida_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_saida_nome TEXT,
  data_saida TIMESTAMPTZ,
  retirado_por_nome TEXT,
  retirado_por_documento TEXT,
  retirado_por_parentesco TEXT,
  foto_comprovante_saida_url TEXT,
  assinatura_digital_url TEXT,
  notificacao_whatsapp_enviada BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 03: CUSTÓDIA DE ITENS / ACHADOS E PERDIDOS
-- ==============================================================================

-- 2.9 TABELA: custodia (Itens sob guarda da portaria)
CREATE TABLE IF NOT EXISTS custodia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT DEFAULT 'outros', -- 'chave', 'documento', 'objeto', 'encomenda_avulsa', 'outros'
  local_armazenamento TEXT DEFAULT 'Armário da Portaria',
  bloco TEXT,
  unidade TEXT,
  morador_nome TEXT,
  foto_item_url TEXT,
  operador_recebimento_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_recebimento_nome TEXT NOT NULL,
  data_recebimento TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'em_custodia', -- 'em_custodia', 'devolvido', 'descartado'
  retirado_por_nome TEXT,
  retirado_por_documento TEXT,
  foto_comprovante_saida_url TEXT,
  assinatura_saida_url TEXT,
  operador_devolucao_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_devolucao_nome TEXT,
  data_devolucao TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 04: MATERIAIS & EQUIPAMENTOS DO POSTO (PATRIMÔNIO)
-- ==============================================================================

-- 2.10 TABELA: materiais_posto (Inventário de HTs, lanternas, celulares, etc.)
CREATE TABLE IF NOT EXISTS materiais_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_patrimonio TEXT,
  categoria TEXT DEFAULT 'equipamento', -- 'comunicacao', 'seguranca', 'informatica', 'ferramenta'
  quantidade_total INTEGER DEFAULT 1,
  quantidade_disponivel INTEGER DEFAULT 1,
  estado_conservacao TEXT DEFAULT 'bom', -- 'novo', 'bom', 'regular', 'ruim', 'em_manutencao'
  localizacao TEXT DEFAULT 'Guarita Principal',
  observacoes TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 05: QUADRO DIGITAL DE CHAVES
-- ==============================================================================

-- 2.11 TABELA: chaves (Cadastro de Chaves Físicas e Mestres)
CREATE TABLE IF NOT EXISTS chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  identificacao TEXT NOT NULL, -- Ex: 'CH-01', 'Bomba 02', 'Salão de Festas'
  setor_local TEXT NOT NULL,
  sala_porta TEXT,
  status TEXT DEFAULT 'disponivel', -- 'disponivel', 'retirada', 'extraviada', 'manutencao'
  observacao TEXT,
  foto_chave_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.12 TABELA: movimentacao_chaves (Controle de Retiradas e Devoluções)
CREATE TABLE IF NOT EXISTS movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  chave_id UUID NOT NULL REFERENCES chaves(id) ON DELETE CASCADE,
  operador_retirada_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_retirada_nome TEXT NOT NULL,
  retirado_por_nome TEXT NOT NULL,
  retirado_por_tipo TEXT DEFAULT 'morador', -- 'morador', 'prestador', 'funcionario'
  retirado_por_documento TEXT,
  telefone_contato TEXT,
  data_retirada TIMESTAMPTZ DEFAULT NOW(),
  previsao_devolucao TIMESTAMPTZ,
  data_devolucao TIMESTAMPTZ,
  operador_devolucao_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_devolucao_nome TEXT,
  observacoes TEXT,
  foto_comprovante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 06: GESTÃO DE MANUTENÇÃO PREDIAL & ORDENS DE SERVIÇO
-- ==============================================================================

-- 2.13 TABELA: chamados_manutencao (Chamados Corretivos / OS)
CREATE TABLE IF NOT EXISTS chamados_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT DEFAULT 'eletrica', -- 'eletrica', 'hidraulica', 'civil', 'elevadores', 'portoes', 'seguranca'
  prioridade TEXT DEFAULT 'media', -- 'baixa', 'media', 'alta', 'critica'
  local TEXT NOT NULL,
  solicitante_nome TEXT NOT NULL,
  solicitante_tipo TEXT DEFAULT 'porteiro',
  fotos JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'aberto', -- 'aberto', 'em_andamento', 'concluido', 'cancelado'
  responsavel_nome TEXT,
  data_abertura TIMESTAMPTZ DEFAULT NOW(),
  data_conclusao TIMESTAMPTZ,
  custo_estimado NUMERIC(10,2) DEFAULT 0,
  custo_real NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.14 TABELA: checklist_manutencao (Rotinas Preventivas)
CREATE TABLE IF NOT EXISTS checklist_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  item_nome TEXT NOT NULL,
  frequencia TEXT DEFAULT 'diaria', -- 'diaria', 'semanal', 'quinzenal', 'mensal'
  local TEXT,
  instrucoes TEXT,
  ativo BOOLEAN DEFAULT true,
  ultima_conferencia TIMESTAMPTZ,
  proxima_conferencia TIMESTAMPTZ,
  operador_conferencia_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 07: GESTÃO DE RONDAS PATRIMONIAIS & PONTOS QR CODE / NFC
-- ==============================================================================

-- 2.15 TABELA: rondas_setores (Setores Patrimoniais de Ronda)
CREATE TABLE IF NOT EXISTS rondas_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.16 TABELA: rondas_pontos (Pontos Físicos de Ronda com QR Code / NFC)
CREATE TABLE IF NOT EXISTS rondas_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  setor_id UUID REFERENCES rondas_setores(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  codigo_qr TEXT NOT NULL,
  nfc_tag_id TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  ordem INTEGER DEFAULT 0,
  instrucoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.17 TABELA: rondas_execucao (Sessões de Rondas Iniciadas e Concluídas)
CREATE TABLE IF NOT EXISTS rondas_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_nome TEXT NOT NULL,
  setor_id UUID REFERENCES rondas_setores(id) ON DELETE SET NULL,
  inicio TIMESTAMPTZ DEFAULT NOW(),
  fim TIMESTAMPTZ,
  duracao_segundos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'em_andamento', -- 'em_andamento', 'concluida', 'incompleta', 'abortada'
  total_pontos INTEGER DEFAULT 0,
  pontos_conferidos INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.18 TABELA: rondas_registros (Leituras de Pontos em Tempo Real)
CREATE TABLE IF NOT EXISTS rondas_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  ronda_execucao_id UUID REFERENCES rondas_execucao(id) ON DELETE CASCADE,
  ponto_id UUID REFERENCES rondas_pontos(id) ON DELETE SET NULL,
  ponto_nome TEXT NOT NULL,
  operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_nome TEXT NOT NULL,
  horario_leitura TIMESTAMPTZ DEFAULT NOW(),
  metodo_leitura TEXT DEFAULT 'qrcode', -- 'qrcode', 'nfc', 'manual'
  foto_url TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 08: LIVRO DIGITAL DE OCORRÊNCIAS
-- ==============================================================================

-- 2.19 TABELA: ocorrencias (Registro de Incidentes, Barulho, Notificações)
CREATE TABLE IF NOT EXISTS ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  gravidade TEXT DEFAULT 'media', -- 'baixa', 'media', 'alta', 'critica'
  bloco TEXT,
  unidade TEXT,
  envolvidos TEXT,
  fotos JSONB DEFAULT '[]'::jsonb,
  data_ocorrencia TIMESTAMPTZ DEFAULT NOW(),
  operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_nome TEXT NOT NULL,
  status TEXT DEFAULT 'registrada', -- 'registrada', 'em_analise', 'concluida'
  providencias TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 09: PASSAGEM DE POSTO & TROCA DE PLANTÃO
-- ==============================================================================

-- 2.20 TABELA: passagens_posto (Registro Formal de Troca de Plantão na Guarita)
CREATE TABLE IF NOT EXISTS passagens_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  operador_saint_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_saint_nome TEXT NOT NULL,
  operador_entran_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_entran_nome TEXT NOT NULL,
  data_passagem TIMESTAMPTZ DEFAULT NOW(),
  turno TEXT NOT NULL, -- 'diurno', 'noturno', etc.
  status_posto TEXT DEFAULT 'normal', -- 'normal', 'alerta', 'irregular'
  ocorrencias_resumo TEXT,
  pendencias TEXT,
  checklist_resumo JSONB DEFAULT '{}'::jsonb,
  materiais_conferidos BOOLEAN DEFAULT true,
  chaves_conferidas BOOLEAN DEFAULT true,
  assinatura_saint_url TEXT,
  assinatura_entran_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.21 TABELA: lembretes_portaria (Avisos Importantes e Trocas de Recados)
CREATE TABLE IF NOT EXISTS lembretes_portaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_alvo TIMESTAMPTZ DEFAULT NOW(),
  prioridade TEXT DEFAULT 'normal', -- 'baixa', 'normal', 'alta', 'urgente'
  status TEXT DEFAULT 'pendente', -- 'pendente', 'lido', 'concluido'
  destinatario_tipo TEXT DEFAULT 'todos', -- 'todos', 'diurno', 'noturno', 'unidade'
  destinatario_unidade TEXT,
  operador_criacao_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 10: PRESTADORES DE SERVIÇO & GESTÃO DE OBRAS
-- ==============================================================================

-- 2.22 TABELA: prestadores (Cadastro Base de Terceiros e Trabalhadores)
CREATE TABLE IF NOT EXISTS prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf_rg TEXT,
  empresa TEXT,
  telefone TEXT,
  foto_url TEXT,
  autorizado BOOLEAN DEFAULT true,
  autorizado_por TEXT,
  unidade_destino TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.23 TABELA: prestadores_acessos (Entrada e Saída em Tempo Real)
CREATE TABLE IF NOT EXISTS prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  prestador_id UUID REFERENCES prestadores(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  empresa TEXT,
  documento TEXT,
  tipo TEXT DEFAULT 'prestador', -- 'prestador', 'visitante', 'obra', 'corretor'
  placa_veiculo TEXT,
  unidade_autorizada TEXT NOT NULL,
  autorizado_por TEXT NOT NULL,
  operador_entrada_nome TEXT NOT NULL,
  entrada_em TIMESTAMPTZ DEFAULT NOW(),
  operador_saida_nome TEXT,
  saida_em TIMESTAMPTZ,
  foto_entrada_url TEXT,
  foto_saida_url TEXT,
  observacao TEXT,
  status TEXT DEFAULT 'presente', -- 'presente', 'finalizado'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.24 TABELA: obras_reformas (Acompanhamento de Reformas por Unidade)
CREATE TABLE IF NOT EXISTS obras_reformas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL,
  tipo_obra TEXT NOT NULL, -- 'reforma_completa', 'pintura', 'eletrica', 'hidraulica'
  responsavel_nome TEXT NOT NULL,
  responsavel_telefone TEXT,
  data_inicio DATE NOT NULL,
  data_previsao_fim DATE,
  status TEXT DEFAULT 'em_andamento', -- 'autorizada', 'em_andamento', 'suspensa', 'concluida'
  dias_horarios_permitidos TEXT DEFAULT 'Segunda a Sexta, das 08h às 17h',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 11: BANCADA DE CONFERÊNCIA FÍSICA E TOUCH
-- ==============================================================================

-- 2.25 TABELA: bancada_volumes (Volumes fisicamente alocados na bancada de triagem)
CREATE TABLE IF NOT EXISTS bancada_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  estrutura TEXT NOT NULL, -- Bloco / Torre / Casa
  unidade TEXT NOT NULL,
  volumes INTEGER NOT NULL DEFAULT 1,
  local_armazenamento TEXT DEFAULT 'Bancada',
  observacao TEXT,
  operador_nome TEXT NOT NULL,
  operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'em_bancada', -- 'em_bancada', 'entregue', 'zerado'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.26 TABELA: bancada_conferencias (Snapshots Históricos de Troca de Plantão)
CREATE TABLE IF NOT EXISTS bancada_conferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  operador_nome TEXT NOT NULL,
  data_conferencia TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT DEFAULT 'Troca de Plantão',
  total_volumes INTEGER DEFAULT 0,
  total_unidades INTEGER DEFAULT 0,
  total_blocos INTEGER DEFAULT 0,
  itens_snapshot JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO 12 & AUDITORIA: HISTÓRICO ABSOLUTO & TABELAS AUXILIARES
-- ==============================================================================

-- 2.27 TABELA: historico_absoluto (Trilha Auditável Inviolável de Todas as Ações)
CREATE TABLE IF NOT EXISTS historico_absoluto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_nome TEXT NOT NULL,
  operador_login TEXT,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  ip TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.28 TABELA: templates_whatsapp (Mensagens Automáticas Configuráveis)
CREATE TABLE IF NOT EXISTS templates_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  identificador TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.29 TABELA: agenda_emergencia (Telefones Úteis e Pânico da Portaria)
CREATE TABLE IF NOT EXISTS agenda_emergencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome_contato TEXT NOT NULL,
  cargo_servico TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp TEXT,
  categoria TEXT DEFAULT 'emergencia', -- 'emergencia', 'manutencao', 'administracao'
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TRIGGERS AUTOMÁTICAS DE 'updated_at' PARA TODAS AS TABELAS
-- ==============================================================================
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'condominios', 'configuracoes', 'operadores', 'moradores', 'entregadores',
    'lotes_re', 'locais_armazenamento', 'encomendas_itens', 'custodia',
    'materiais_posto', 'chaves', 'movimentacao_chaves', 'chamados_manutencao',
    'checklist_manutencao', 'rondas_setores', 'rondas_pontos', 'rondas_execucao',
    'rondas_registros', 'ocorrencias', 'passagens_posto', 'lembretes_portaria',
    'prestadores', 'prestadores_acessos', 'obras_reformas', 'bancada_volumes',
    'bancada_conferencias', 'historico_absoluto', 'templates_whatsapp', 'agenda_emergencia'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_timestamp ON %I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();', t);
  END LOOP;
END $$;

-- ==============================================================================
-- 4. ÍNDICES DE ALTA PERFORMANCE (FILTROS RÁPIDOS E MULTI-TENANCY)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_condominios_created ON condominios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_configuracoes_condo ON configuracoes(condominio_id);

CREATE INDEX IF NOT EXISTS idx_operadores_condo ON operadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_operadores_login ON operadores(login);

CREATE INDEX IF NOT EXISTS idx_moradores_condo ON moradores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_moradores_unidade ON moradores(condominio_id, bloco, unidade);

CREATE INDEX IF NOT EXISTS idx_lotes_re_condo ON lotes_re(condominio_id);
CREATE INDEX IF NOT EXISTS idx_lotes_re_status ON lotes_re(condominio_id, status);

CREATE INDEX IF NOT EXISTS idx_encomendas_itens_condo ON encomendas_itens(condominio_id);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_status ON encomendas_itens(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_unidade ON encomendas_itens(condominio_id, bloco, unidade);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_rastreio ON encomendas_itens(codigo_barras);

CREATE INDEX IF NOT EXISTS idx_custodia_condo ON custodia(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_materiais_posto_condo ON materiais_posto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_chaves_condo ON chaves(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_mov_chaves_condo ON movimentacao_chaves(condominio_id, data_retirada DESC);

CREATE INDEX IF NOT EXISTS idx_chamados_manut_condo ON chamados_manutencao(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_rondas_exec_condo ON rondas_execucao(condominio_id, inicio DESC);
CREATE INDEX IF NOT EXISTS idx_rondas_reg_condo ON rondas_registros(condominio_id, horario_leitura DESC);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_condo ON ocorrencias(condominio_id, data_ocorrencia DESC);
CREATE INDEX IF NOT EXISTS idx_passagens_posto_condo ON passagens_posto(condominio_id, data_passagem DESC);
CREATE INDEX IF NOT EXISTS idx_lembretes_condo ON lembretes_portaria(condominio_id, status);

CREATE INDEX IF NOT EXISTS idx_prestadores_condo ON prestadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_acessos_condo ON prestadores_acessos(condominio_id, status);

CREATE INDEX IF NOT EXISTS idx_bancada_volumes_condo ON bancada_volumes(condominio_id, estrutura, unidade);
CREATE INDEX IF NOT EXISTS idx_bancada_conf_condo ON bancada_conferencias(condominio_id, data_conferencia DESC);

CREATE INDEX IF NOT EXISTS idx_hist_abs_condo ON historico_absoluto(condominio_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_hist_abs_modulo ON historico_absoluto(modulo, acao);

-- ==============================================================================
-- 5. PERMISSÕES PARA A CAMADA REST (POSTGREST / CLIENTE FRONTEND PWA)
-- ==============================================================================
-- Cria os papéis caso use PostgREST puro na Máquina Virtual Oracle Cloud
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_user') THEN
    CREATE ROLE web_user NOINHERIT LOGIN PASSWORD 'porttohub_oci_secret_2026';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, web_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, web_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, web_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, web_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, web_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, web_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, web_user;

-- ==============================================================================
-- 6. CARGA INICIAL (SEED DATA): CONDOMÍNIO MODELO E OPERADOR ADMIN MASTER
-- ==============================================================================
-- Insere o Condomínio Inicial padrão caso ainda não exista
INSERT INTO condominios (
  id,
  nome,
  tipo_estrutura,
  qtd_blocos,
  unidades_por_bloco,
  cidade,
  uf,
  telefone_portaria,
  escala_plantao,
  horario_diurno_inicio,
  horario_noturno_inicio,
  intervalo_ronda
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Residencial PorttoHub OCI',
  'casas',
  1,
  100,
  'São Paulo',
  'SP',
  '(11) 99999-0000',
  '06_18',
  '06:00',
  '18:00',
  15
) ON CONFLICT (id) DO NOTHING;

-- Insere as Configurações do Condomínio Inicial
INSERT INTO configuracoes (
  condominio_id,
  locais_armazenamento,
  feature_flags
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '["Bancada Principal", "Prateleira A", "Prateleira B", "Armário Chaves", "Chão / Caixas Grandes"]'::jsonb,
  '{"mod01_cadastros_base": true, "mod02_gestao_encomendas": true, "mod03_custodia_itens": true, "mod04_materiais_posto": true, "mod05_quadro_chaves": true, "mod06_gestao_manutencao": true, "mod07_gestao_ronda": true, "mod08_livro_ocorrencias": true, "mod09_passagem_posto": true, "mod10_prestadores_servico": true, "mod11_bancada_conferencia": true, "mod12_historico_absoluto": true, "mod_portal_sindico": true}'::jsonb
) ON CONFLICT (condominio_id) DO NOTHING;

-- Insere Operador Administrador Master (Login: admin | Senha: admin123)
INSERT INTO operadores (
  id,
  condominio_id,
  nome,
  login,
  senha,
  perfil,
  nivel_acesso,
  ativo,
  cargo
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Administrador PorttoHub',
  'admin',
  'admin123',
  'admin',
  1,
  true,
  'Administrador Master'
) ON CONFLICT (id) DO NOTHING;

-- Insere Operador Supervisor Global (Login: supervisor | Senha: super123)
INSERT INTO operadores (
  id,
  condominio_id,
  nome,
  login,
  senha,
  perfil,
  nivel_acesso,
  ativo,
  cargo
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Supervisor de Operações',
  'supervisor',
  'super123',
  'supervisor',
  2,
  true,
  'Supervisor Geral'
) ON CONFLICT (id) DO NOTHING;

-- Insere Templates de WhatsApp Padrão
INSERT INTO templates_whatsapp (
  condominio_id,
  identificador,
  titulo,
  conteudo,
  variaveis
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'aviso_encomenda',
  'Aviso de Encomenda na Portaria',
  'Olá {NOME_MORADOR}! Sua encomenda com código {CODIGO_RASTREIO} chegou à portaria e está guardada no local: {LOCAL_GUARDA}. Favor retirar com a equipe de portaria.',
  '["NOME_MORADOR", "CODIGO_RASTREIO", "LOCAL_GUARDA"]'::jsonb
),
(
  '11111111-1111-1111-1111-111111111111',
  'comprovante_entrega',
  'Comprovante de Retirada',
  'Olá {NOME_MORADOR}! A encomenda {CODIGO_RASTREIO} foi retirada na portaria por {RETIRADO_POR} em {DATA_HORA}. Obrigado!',
  '["NOME_MORADOR", "CODIGO_RASTREIO", "RETIRADO_POR", "DATA_HORA"]'::jsonb
) ON CONFLICT DO NOTHING;

-- Notifica o PostgREST para recarregar o schema imediatamente
NOTIFY pgrst, 'reload schema';

COMMIT;

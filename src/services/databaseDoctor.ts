import { supabase } from './supabase';

export interface TableDiagnostic {
  canonicalName: string;
  duplicateOrLegacyNames: string[];
  purpose: string;
  category: string;
  status: 'ok' | 'needs_migration' | 'checking' | 'error';
  canonicalCount?: number;
  legacyCounts?: Record<string, number>;
  notes: string;
}

export const CANONICAL_SCHEMA_MAP: TableDiagnostic[] = [
  {
    canonicalName: 'condominios',
    duplicateOrLegacyNames: [],
    purpose: 'Tabela principal multi-tenant de condomínios gerenciados',
    category: 'Cadastros Base',
    status: 'checking',
    notes: 'Essencial. Contém id, nome, endereco, created_at.'
  },
  {
    canonicalName: 'operadores',
    duplicateOrLegacyNames: ['usuarios_sistema'],
    purpose: 'Contas de operadores da portaria, supervisores, síndicos e admin',
    category: 'Segurança & Acesso',
    status: 'checking',
    notes: 'A tabela usuarios_sistema é redundante e pode ser migrada para operadores.'
  },
  {
    canonicalName: 'moradores',
    duplicateOrLegacyNames: ['unidades', 'blocos'],
    purpose: 'Cadastro de moradores com bloco, unidade, telefone WhatsApp',
    category: 'Cadastros Base',
    status: 'checking',
    notes: 'As tabelas avulsas "blocos" e "unidades" são legadas; moradores armazena diretamente bloco e unidade.'
  },
  {
    canonicalName: 'encomendas_itens',
    duplicateOrLegacyNames: ['encomendas'],
    purpose: 'Itens individuais triados e retidos na portaria',
    category: 'Módulo 02 - Encomendas',
    status: 'checking',
    notes: 'A tabela "encomendas" antiga é órfã; o fluxo usa lotes_re + encomendas_itens.'
  },
  {
    canonicalName: 'lotes_re',
    duplicateOrLegacyNames: [],
    purpose: 'Lotes de Recebimento de Entrega (RE) por entregador',
    category: 'Módulo 02 - Encomendas',
    status: 'checking',
    notes: 'Contém código RE diário sequencial e quantidade declarada.'
  },
  {
    canonicalName: 'entregadores',
    duplicateOrLegacyNames: [],
    purpose: 'Entregadores e transportadoras cadastrados',
    category: 'Módulo 02 - Encomendas',
    status: 'checking',
    notes: 'Contém nome, empresa e documento.'
  },
  {
    canonicalName: 'locais_armazenamento',
    duplicateOrLegacyNames: [],
    purpose: 'Locais físicos de triagem e armazenamento de encomendas (Bancadas, Prateleiras, Armários)',
    category: 'Módulo 02 - Encomendas',
    status: 'checking',
    notes: 'Permite cadastro dinâmico dos locais de guarda da portaria.'
  },
  {
    canonicalName: 'custodia',
    duplicateOrLegacyNames: ['custodia_itens'],
    purpose: 'Guarda temporária de itens deixados na portaria (chaves, pacotes, objetos)',
    category: 'Módulo 03 - Custódia',
    status: 'checking',
    notes: 'Custodia.jsx usa "custodia". A tabela "custodia_itens" é duplicata órfã.'
  },
  {
    canonicalName: 'materiais_posto',
    duplicateOrLegacyNames: ['materiais', 'inspecoes_materiais'],
    purpose: 'Inventário e controle de conservação dos equipamentos da guarita (HT, lanterna, etc.)',
    category: 'Módulo 04 - Materiais',
    status: 'checking',
    notes: 'Materiais.jsx gravava em materiais_posto, mas PassagemPosto lia de materiais. Devemos unificar em materiais_posto.'
  },
  {
    canonicalName: 'chaves',
    duplicateOrLegacyNames: [],
    purpose: 'Quadro digital de chaves do condomínio',
    category: 'Módulo 05 - Chaves',
    status: 'checking',
    notes: 'Contém código da chave, identificador, status e tempo limite.'
  },
  {
    canonicalName: 'movimentacao_chaves',
    duplicateOrLegacyNames: ['movimentacoes_chaves'],
    purpose: 'Histórico e status de retiradas/devoluções de chaves',
    category: 'Módulo 05 - Chaves',
    status: 'checking',
    notes: 'A tabela no plural "movimentacoes_chaves" é duplicata órfã.'
  },
  {
    canonicalName: 'checklist_manutencao',
    duplicateOrLegacyNames: [],
    purpose: 'Checklist de rotinas periódicas de manutenção predial',
    category: 'Módulo 06 - Manutenção',
    status: 'checking',
    notes: 'Tarefas diárias, semanais e mensais do manutencista.'
  },
  {
    canonicalName: 'chamados_manutencao',
    duplicateOrLegacyNames: [],
    purpose: 'Ordens de serviço (OS) e chamados corretivos',
    category: 'Módulo 06 - Manutenção',
    status: 'checking',
    notes: 'Contém fotos antes/depois e status do chamado.'
  },
  {
    canonicalName: 'rondas_pontos',
    duplicateOrLegacyNames: ['pontos_ronda'],
    purpose: 'Pontos físicos de ronda com QR Code e coordenadas GPS',
    category: 'Módulo 07 - Rondas',
    status: 'checking',
    notes: 'Rondas.jsx usa rondas_pontos. A tabela "pontos_ronda" é duplicata legada.'
  },
  {
    canonicalName: 'rondas_execucao',
    duplicateOrLegacyNames: ['rondas_execucoes'],
    purpose: 'Sessões de rondas patrimoniais iniciadas e finalizadas',
    category: 'Módulo 07 - Rondas',
    status: 'checking',
    notes: 'A tabela "rondas_execucoes" com final "es" é duplicata.'
  },
  {
    canonicalName: 'rondas_registros',
    duplicateOrLegacyNames: ['registros_ronda'],
    purpose: 'Leituras de QR Code, checklist do ponto e fotos das rondas',
    category: 'Módulo 07 - Rondas',
    status: 'checking',
    notes: 'A tabela "registros_ronda" é duplicata legada.'
  },
  {
    canonicalName: 'rondas_setores',
    duplicateOrLegacyNames: [],
    purpose: 'Setores patrimoniais pertencentes e checklists personalizados de inspeção',
    category: 'Módulo 07 - Rondas',
    status: 'checking',
    notes: 'Configuração dos setores com seus respectivos itens de conferência.'
  },
  {
    canonicalName: 'ocorrencias',
    duplicateOrLegacyNames: [],
    purpose: 'Livro digital de ocorrências internas e de moradores',
    category: 'Módulo 08 - Ocorrências',
    status: 'checking',
    notes: 'Auditado, com prioridade, fotos e disparo para WhatsApp.'
  },
  {
    canonicalName: 'passagens_posto',
    duplicateOrLegacyNames: ['rondas_passagem_posto'],
    purpose: 'Troca de turno e dupla assinatura digital da guarita',
    category: 'Módulo 09 - Passagem de Posto',
    status: 'checking',
    notes: 'Rondas.jsx gravava em rondas_passagem_posto e PassagemPosto.jsx em passagens_posto. Ambas devem usar passagens_posto.'
  },
  {
    canonicalName: 'prestadores',
    duplicateOrLegacyNames: ['visitas_prestadores'],
    purpose: 'Cadastro e registro de entrada/saída de prestadores e obras',
    category: 'Módulo 10 - Prestadores & Obras',
    status: 'checking',
    notes: 'A tabela "visitas_prestadores" é legada e redundante.'
  },
  {
    canonicalName: 'configuracoes',
    duplicateOrLegacyNames: [],
    purpose: 'Parametrização do condomínio e Feature Flags de módulos',
    category: 'Módulo 11 - Configurações',
    status: 'checking',
    notes: 'Armazena ativação dos módulos por condomínio.'
  },
  {
    canonicalName: 'templates_whatsapp',
    duplicateOrLegacyNames: [],
    purpose: 'Modelos configuráveis de mensagens automáticas de WhatsApp',
    category: 'Módulo 11 - Configurações',
    status: 'checking',
    notes: 'Templates com tags como {NOME_MORADOR}, {CODIGO}, etc.'
  },
  {
    canonicalName: 'agenda_emergencia',
    duplicateOrLegacyNames: [],
    purpose: 'Contatos de emergência (Polícia, SAMU, Zelador, Bombeiros)',
    category: 'Módulo 11 - Configurações',
    status: 'checking',
    notes: 'Agenda e botão de pânico rápido.'
  },
  {
    canonicalName: 'lembretes_portaria',
    duplicateOrLegacyNames: [],
    purpose: 'Bloco de mensagens e lembretes da portaria (Portaria ⇄ Moradores)',
    category: 'Comunicação & Mensagens',
    status: 'checking',
    notes: 'Isolamento por condominio_id, unidade_bloco, tipo, lido (booleano) e Realtime.'
  },
  {
    canonicalName: 'bancada_volumes',
    duplicateOrLegacyNames: [],
    purpose: 'Controle de volumes físicos retidos no balcão da guarita',
    category: 'Módulo 11 - Bancada',
    status: 'checking',
    notes: 'Volumes agrupados por estrutura e unidade física.'
  }
];

export async function runDatabaseAudit(): Promise<{
  diagnostics: TableDiagnostic[];
  orphanedTablesFound: string[];
  totalCanonical: number;
  totalOrphaned: number;
}> {
  const diagnostics: TableDiagnostic[] = JSON.parse(JSON.stringify(CANONICAL_SCHEMA_MAP));
  const orphanedTablesFound: string[] = [];

  for (const diag of diagnostics) {
    try {
      const { count, error } = await supabase
        .from(diag.canonicalName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        diag.status = 'error';
        diag.notes += ` (Erro ao consultar: ${error.message})`;
      } else {
        diag.canonicalCount = count ?? 0;
        diag.status = 'ok';

        // Verificação proativa de colunas essenciais
        if (diag.canonicalName === 'moradores') {
          const { error: colErr } = await supabase.from('moradores').select('cpf, rg, foto_url, tag_rfid, veiculo_placa').limit(1);
          if (colErr && (colErr.message?.includes('does not exist') || colErr.code === '42703' || colErr.code === 'PGRST204')) {
            diag.status = 'needs_migration';
            diag.notes = '⚠️ Colunas faltantes detectadas (foto_url, cpf, rg, veiculo_placa, tag_rfid). Execute o Script de Correção no Supabase.';
          }
        } else if (diag.canonicalName === 'encomendas_itens') {
          const { error: colErr } = await supabase.from('encomendas_itens').select('documento_retirante, assinatura_url, operador_baixa_nome').limit(1);
          if (colErr && (colErr.message?.includes('does not exist') || colErr.code === '42703' || colErr.code === 'PGRST204')) {
            diag.status = 'needs_migration';
            diag.notes = '⚠️ Colunas de baixa/assinatura faltantes. Execute o Script de Correção no Supabase.';
          }
        } else if (diag.canonicalName === 'custodia') {
          const { error: colErr } = await supabase.from('custodia').select('codigo, deixado_por, foto_url').limit(1);
          if (colErr && (colErr.message?.includes('does not exist') || colErr.code === '42703' || colErr.code === 'PGRST204')) {
            diag.status = 'needs_migration';
            diag.notes = '⚠️ Colunas de código, depositante e foto faltantes. Execute o Script de Correção.';
          }
        } else if (diag.canonicalName === 'prestadores') {
          const { error: colErr } = await supabase.from('prestadores').select('foto_rosto, placa_veiculo, foto_documento').limit(1);
          if (colErr && (colErr.message?.includes('does not exist') || colErr.code === '42703' || colErr.code === 'PGRST204')) {
            diag.status = 'needs_migration';
            diag.notes = '⚠️ Colunas de fotos e placas faltantes. Execute o Script de Correção.';
          }
        }
      }
    } catch {
      diag.status = 'error';
    }

    diag.legacyCounts = {};
    for (const legacyName of diag.duplicateOrLegacyNames) {
      try {
        const { count, error } = await supabase
          .from(legacyName)
          .select('*', { count: 'exact', head: true });

        if (!error && typeof count === 'number') {
          diag.legacyCounts[legacyName] = count;
          if (count > 0) {
            diag.status = 'needs_migration';
          }
          orphanedTablesFound.push(legacyName);
        }
      } catch {
        // Tabela não existe ou inacessível
      }
    }
  }

  return {
    diagnostics,
    orphanedTablesFound,
    totalCanonical: diagnostics.length,
    totalOrphaned: orphanedTablesFound.length
  };
}

export function generateMigrationSql(): string {
  return `-- ==============================================================================
-- INFPORT 1.0 / PORTTOHUB - SCRIPT MESTRE DE CORREÇÃO DEFINITIVA DO SUPABASE
-- ==============================================================================
-- Este script corrige 100% das tabelas e colunas faltantes no Supabase:
-- - Adiciona foto_url, cpf, rg, tag_rfid, placas, etc. na tabela 'moradores'
-- - Corrige colunas em 'operadores', 'condominios', 'encomendas_itens', 'lotes_re'
-- - Corrige 'custodia', 'materiais_posto', 'chaves', 'movimentacao_chaves'
-- - Corrige 'checklist_manutencao', 'chamados_manutencao', 'rondas_*'
-- - Corrige 'ocorrencias', 'passagens_posto', 'prestadores', 'prestadores_acessos'
-- - Corrige 'lembretes_portaria', 'bancada_volumes', 'bancada_conferencias', 'historico_absoluto'
-- - Habilita RLS e recarrega o cache do PostgREST
--
-- COMO EXECUTAR:
-- 1. Acesse o painel do seu projeto Supabase: https://supabase.com/dashboard
-- 2. Vá em "SQL Editor" (ícone de terminal/código no menu lateral esquerdo)
-- 3. Clique em "+ New query", cole todo este arquivo e clique em "Run" (Executar)
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA: condominios
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

-- 2. TABELA: configuracoes
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

-- 3. TABELA: moradores (Foto, CPF, RG, RFID, Veículos e Acesso)
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

-- 4. TABELA: operadores
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

-- 5. TABELA: entregadores
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
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. TABELA: lotes_re
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

-- 7. TABELA: encomendas_itens
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

-- Sincronizar colunas sinônimas
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


-- 8. TABELA: locais_armazenamento
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

-- 9. TABELA: custodia
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

CREATE INDEX IF NOT EXISTS idx_custodia_condo_status_created ON public.custodia(condominio_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custodia_codigo ON public.custodia(codigo_custodia);

-- 10. TABELA: materiais_posto
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

-- 11. TABELAS: chaves & movimentacao_chaves
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

-- 12. TABELAS: checklist_manutencao & chamados_manutencao
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
  ADD COLUMN IF NOT EXISTS solicitante TEXT,
  ADD COLUMN IF NOT EXISTS local_especifico TEXT,
  ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 13. TABELAS: rondas_pontos, rondas_execucao, rondas_registros & rondas_setores
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

ALTER TABLE IF EXISTS public.rondas_registros
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS ronda_id UUID,
  ADD COLUMN IF NOT EXISTS ponto_id UUID,
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS foto_evidencia_url TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS status_ponto TEXT DEFAULT 'conforme',
  ADD COLUMN IF NOT EXISTS checklist_respostas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

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

-- 14. TABELA: ocorrencias
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

-- 15. TABELA: passagens_posto
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

-- 16. TABELAS: prestadores & prestadores_acessos
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

-- 17. TABELA: lembretes_portaria
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

-- 18. TABELAS: bancada_volumes & bancada_conferencias
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

-- 19. TABELA: historico_absoluto
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

-- 20. TABELAS: templates_whatsapp & agenda_emergencia
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

-- 21. LIMPEZA SEGURA DE TABELAS LEGADAS/DUPLICADAS
DROP TABLE IF EXISTS rondas_execucoes CASCADE;
DROP TABLE IF EXISTS registros_ronda CASCADE;
DROP TABLE IF EXISTS pontos_ronda CASCADE;
DROP TABLE IF EXISTS movimentacoes_chaves CASCADE;
DROP TABLE IF EXISTS rondas_passagem_posto CASCADE;
DROP TABLE IF EXISTS custodia_itens CASCADE;
DROP TABLE IF EXISTS inspecoes_materiais CASCADE;
DROP TABLE IF EXISTS visitas_prestadores CASCADE;
DROP TABLE IF EXISTS usuarios_sistema CASCADE;
DROP TABLE IF EXISTS blocos CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;
DROP TABLE IF EXISTS encomendas CASCADE;
DROP TABLE IF EXISTS materiais CASCADE;

-- 22. SUPABASE STORAGE (Bucket 'encomendas' e Políticas de Armazenamento)
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

-- 23. ROW LEVEL SECURITY (RLS) E POLÍTICAS PERMISSIVAS
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

-- 24. SUPABASE REALTIME (Configuração de publicações em tempo real)
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
    'passagens_posto'
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

-- 25. RECARREGAR O CACHE DO SCHEMA POSTGREST DO SUPABASE
NOTIFY pgrst, 'reload schema';
`;
}

export interface CondominioConfigDiagnostic {
  condominioId: string;
  condominioNome: string;
  configId?: string | null;
  status: 'integra' | 'ausente' | 'corrompida';
  detalhesStatus: string;
  featureFlags: {
    mod02_gestao_encomendas: boolean;
    mod03_custodia_itens: boolean;
    mod04_materiais_posto: boolean;
    mod05_quadro_chaves: boolean;
    mod06_gestao_manutencao: boolean;
    mod07_gestao_ronda: boolean;
    mod08_livro_ocorrencias: boolean;
    mod09_passagem_posto: boolean;
    mod10_prestadores_servico: boolean;
  };
  chavesFaltantes: string[];
}

export const REQUIRED_MODULE_KEYS = [
  'mod02_gestao_encomendas',
  'mod03_custodia_itens',
  'mod04_materiais_posto',
  'mod05_quadro_chaves',
  'mod06_gestao_manutencao',
  'mod07_gestao_ronda',
  'mod08_livro_ocorrencias',
  'mod09_passagem_posto',
  'mod10_prestadores_servico'
] as const;

/**
 * Executa verificação de integridade das configurações de módulos
 * para cada condomínio cadastrado na tabela condominios.
 */
export async function auditCondominiosConfigs(): Promise<CondominioConfigDiagnostic[]> {
  try {
    const { data: condominios, error: condErr } = await supabase
      .from('condominios')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (condErr) throw condErr;
    if (!condominios || condominios.length === 0) return [];

    const { data: configs, error: cfgErr } = await supabase
      .from('configuracoes')
      .select('*');

    if (cfgErr) {
      console.warn('Aviso ao consultar configuracoes:', cfgErr.message);
    }

    const listaDiagnosticos: CondominioConfigDiagnostic[] = condominios.map((condo) => {
      const cfg = configs?.find((c) => c.condominio_id === condo.id);

      if (!cfg) {
        return {
          condominioId: condo.id,
          condominioNome: condo.nome || 'Condomínio Sem Nome',
          configId: null,
          status: 'ausente',
          detalhesStatus: 'Nenhum registro encontrado na tabela configuracoes.',
          featureFlags: {
            mod02_gestao_encomendas: true,
            mod03_custodia_itens: true,
            mod04_materiais_posto: true,
            mod05_quadro_chaves: true,
            mod06_gestao_manutencao: true,
            mod07_gestao_ronda: true,
            mod08_livro_ocorrencias: true,
            mod09_passagem_posto: true,
            mod10_prestadores_servico: true
          },
          chavesFaltantes: [...REQUIRED_MODULE_KEYS]
        };
      }

      const flagsJson = typeof cfg.feature_flags === 'object' && cfg.feature_flags !== null 
        ? cfg.feature_flags 
        : {};

      const chavesFaltantes: string[] = [];
      const resolvedFlags: any = {};

      REQUIRED_MODULE_KEYS.forEach((key) => {
        const valColuna = cfg[key];
        const valJson = flagsJson[key];

        if (typeof valColuna === 'boolean') {
          resolvedFlags[key] = valColuna;
        } else if (typeof valJson === 'boolean') {
          resolvedFlags[key] = valJson;
        } else {
          chavesFaltantes.push(key);
          resolvedFlags[key] = true; // valor padrão
        }
      });

      let status: 'integra' | 'ausente' | 'corrompida' = 'integra';
      let detalhesStatus = 'Configuração completa e íntegra (9/9 módulos parametrizados)';

      if (chavesFaltantes.length > 0 || !cfg.feature_flags || typeof cfg.feature_flags !== 'object') {
        status = 'corrompida';
        detalhesStatus = chavesFaltantes.length > 0 
          ? `Faltam ${chavesFaltantes.length} chave(s) de módulos: ${chavesFaltantes.join(', ')}`
          : 'Campo feature_flags nulo ou não formatado como JSON';
      }

      return {
        condominioId: condo.id,
        condominioNome: condo.nome || 'Condomínio Sem Nome',
        configId: cfg.id,
        status,
        detalhesStatus,
        featureFlags: resolvedFlags,
        chavesFaltantes
      };
    });

    return listaDiagnosticos;
  } catch (err) {
    console.error('Erro na auditoria de configurações de condomínios:', err);
    return [];
  }
}

/**
 * Corrige ou restaura a configuração íntegra de um condomínio específico.
 */
export async function repairCondominioConfig(
  condominioId: string, 
  currentDiag?: CondominioConfigDiagnostic
): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultFlags = {
      mod02_gestao_encomendas: currentDiag?.featureFlags?.mod02_gestao_encomendas ?? true,
      mod03_custodia_itens: currentDiag?.featureFlags?.mod03_custodia_itens ?? true,
      mod04_materiais_posto: currentDiag?.featureFlags?.mod04_materiais_posto ?? true,
      mod05_quadro_chaves: currentDiag?.featureFlags?.mod05_quadro_chaves ?? true,
      mod06_gestao_manutencao: currentDiag?.featureFlags?.mod06_gestao_manutencao ?? true,
      mod07_gestao_ronda: currentDiag?.featureFlags?.mod07_gestao_ronda ?? true,
      mod08_livro_ocorrencias: currentDiag?.featureFlags?.mod08_livro_ocorrencias ?? true,
      mod09_passagem_posto: currentDiag?.featureFlags?.mod09_passagem_posto ?? true,
      mod10_prestadores_servico: currentDiag?.featureFlags?.mod10_prestadores_servico ?? true
    };

    // Atualiza imediatamente cache local do navegador
    localStorage.setItem(`infport_flags_${condominioId}`, JSON.stringify(defaultFlags));

    const fullPayload: any = {
      condominio_id: condominioId,
      feature_flags: defaultFlags,
      ...defaultFlags
    };

    let saved = false;

    // Verifica se já existe registro
    const { data: existing } = await supabase
      .from('configuracoes')
      .select('id')
      .eq('condominio_id', condominioId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('configuracoes')
        .update(fullPayload)
        .eq('id', existing.id);
      if (!error) saved = true;
    } else {
      const { error } = await supabase
        .from('configuracoes')
        .insert([fullPayload]);
      if (!error) saved = true;
    }

    // Fallback caso colunas individuais específicas não estejam no cache do Supabase
    if (!saved) {
      const fallbackPayload = {
        condominio_id: condominioId,
        feature_flags: defaultFlags
      };

      if (existing?.id) {
        const { error: fbErr } = await supabase
          .from('configuracoes')
          .update(fallbackPayload)
          .eq('id', existing.id);
        if (fbErr) throw fbErr;
      } else {
        const { error: fbErr } = await supabase
          .from('configuracoes')
          .insert([fallbackPayload]);
        if (fbErr) throw fbErr;
      }
    }

    // Dispara evento em tempo real para sincronização com o App
    window.dispatchEvent(new CustomEvent('modulos_atualizados', {
      detail: { condominio_id: condominioId, flags: defaultFlags }
    }));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao reparar configuração' };
  }
}

/**
 * Corrige em lote todas as configurações ausentes ou corrompidas de condomínios.
 */
export async function repairAllCondominiosConfigs(): Promise<{ totalRepaired: number; totalErrors: number; errors: string[] }> {
  const diagnostics = await auditCondominiosConfigs();
  const needingRepair = diagnostics.filter((d) => d.status !== 'integra');

  let totalRepaired = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  for (const diag of needingRepair) {
    const res = await repairCondominioConfig(diag.condominioId, diag);
    if (res.success) {
      totalRepaired++;
    } else {
      totalErrors++;
      if (res.error) errors.push(`${diag.condominioNome}: ${res.error}`);
    }
  }

  return { totalRepaired, totalErrors, errors };
}

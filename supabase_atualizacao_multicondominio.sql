-- ==============================================================================
-- INFPORT 1.0 - SCRIPT SQL DE ATUALIZAÇÃO E OTIMIZAÇÃO MULTI-CONDOMÍNIOS
-- Execute este script no SQL Editor do seu Supabase se desejar garantir
-- índices otimizados e compatibilidade total para operações multi-condomínio:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

BEGIN;

-- 1. Garante que os índices essenciais de condominio_id existam para consultas instantâneas
CREATE INDEX IF NOT EXISTS idx_lotes_re_condominio ON lotes_re(condominio_id);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_condominio ON encomendas_itens(condominio_id);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_status ON encomendas_itens(status);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_unidade ON encomendas_itens(condominio_id, unidade);

CREATE INDEX IF NOT EXISTS idx_moradores_condominio ON moradores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_operadores_condominio ON operadores(condominio_id);

CREATE INDEX IF NOT EXISTS idx_chaves_condominio ON chaves(condominio_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_chaves_condominio ON movimentacao_chaves(condominio_id);

CREATE INDEX IF NOT EXISTS idx_custodia_condominio ON custodia(condominio_id);
CREATE INDEX IF NOT EXISTS idx_materiais_condominio ON materiais_posto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_chamados_manutencao_condominio ON chamados_manutencao(condominio_id);
CREATE INDEX IF NOT EXISTS idx_checklist_manutencao_condominio ON checklist_manutencao(condominio_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_condominio ON ocorrencias(condominio_id);

CREATE INDEX IF NOT EXISTS idx_prestadores_condominio ON prestadores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_acessos_condominio ON prestadores_acessos(condominio_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_condominio ON auditoria(condominio_id);

-- 2. Garante constraints de Chaves Estrangeiras (FK) para relacionamentos do PostgREST
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_lotes_re_condominio' AND table_name = 'lotes_re'
  ) THEN
    ALTER TABLE lotes_re 
    ADD CONSTRAINT fk_lotes_re_condominio 
    FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_encomendas_itens_condominio' AND table_name = 'encomendas_itens'
  ) THEN
    ALTER TABLE encomendas_itens 
    ADD CONSTRAINT fk_encomendas_itens_condominio 
    FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ==============================================================================
-- PORTTOHUB - CONFIGURAÇÃO COMPLETA DO SUPABASE STORAGE (IMAGENS E ASSINATURAS)
-- ==============================================================================
-- Este script configura o Supabase exclusivamente como Storage de Imagens e Assinaturas
-- para a arquitetura híbrida do PorttoHub (onde os dados residem no Firestore/Firebase
-- e os arquivos de mídia são armazenados com CDN ultrarrápida no Supabase Storage).
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/kkeizhscivyfjgetnbke
-- 2. No menu lateral esquerdo, clique em "SQL Editor".
-- 3. Cole este script completo e clique no botão verde "Run".
-- ==============================================================================

-- 1. HABILITAR EXTENSÃO UUID SE NECESSÁRIO
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. GARANTIR A CRIAÇÃO DO BUCKET PRINCIPAL: 'encomendas'
-- O bucket 'encomendas' é o bucket público oficial utilizado pelo PorttoHub
-- para armazenar fotos de encomendas, etiquetas, comprovantes e assinaturas.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'encomendas',
    'encomendas',
    true, -- Permite acesso público direto (WhatsApp, navegadores, moradores sem login)
    52428800, -- Limite de 50MB por arquivo (as fotos são comprimidas para ~60KB pelo app)
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'image/gif',
        'application/pdf',
        'text/plain'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'image/gif',
        'application/pdf',
        'text/plain'
    ];

-- 3. GARANTIR A CRIAÇÃO DE BUCKETS DEDICADOS ADICIONAIS (OPCIONAL/MODULAR)
-- Caso você queira separar assinaturas ou fotos em buckets próprios no futuro:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'assinaturas',
        'assinaturas',
        true,
        10485760, -- 10MB
        ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    ),
    (
        'fotos',
        'fotos',
        true,
        52428800, -- 50MB
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. HABILITAR ROW LEVEL SECURITY (RLS) NA TABELA DE OBJETOS DO STORAGE
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. REMOVER POLÍTICAS ANTIGAS SE EXISTIREM (EVITA ERRO DE POLÍTICA DUPLICADA)
DROP POLICY IF EXISTS "PorttoHub Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "PorttoHub Anon and Auth Uploads" ON storage.objects;
DROP POLICY IF EXISTS "PorttoHub Anon and Auth Updates" ON storage.objects;
DROP POLICY IF EXISTS "PorttoHub Anon and Auth Deletes" ON storage.objects;

DROP POLICY IF EXISTS "Public Read Access on encomendas" ON storage.objects;
DROP POLICY IF EXISTS "Anon Insert on encomendas" ON storage.objects;
DROP POLICY IF EXISTS "Anon Update on encomendas" ON storage.objects;
DROP POLICY IF EXISTS "Anon Delete on encomendas" ON storage.objects;

-- 6. POLÍTICA DE LEITURA PÚBLICA (SELECT)
-- Permite que qualquer pessoa (moradores via link de WhatsApp ou visualizador interno)
-- visualize fotos de encomendas, comprovantes e assinaturas sem necessidade de token de autenticação.
CREATE POLICY "PorttoHub Public Read Access"
ON storage.objects FOR SELECT
USING (
    bucket_id IN ('encomendas', 'assinaturas', 'fotos')
);

-- 7. POLÍTICA DE UPLOAD (INSERT)
-- Permite que a portaria (tanto anônima quanto autenticada via chave anon do Supabase)
-- envie fotos e assinaturas diretamente pelo navegador via HTML5 Canvas.
CREATE POLICY "PorttoHub Anon and Auth Uploads"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id IN ('encomendas', 'assinaturas', 'fotos')
);

-- 8. POLÍTICA DE ATUALIZAÇÃO / SUBSTITUIÇÃO (UPDATE)
CREATE POLICY "PorttoHub Anon and Auth Updates"
ON storage.objects FOR UPDATE
USING (
    bucket_id IN ('encomendas', 'assinaturas', 'fotos')
)
WITH CHECK (
    bucket_id IN ('encomendas', 'assinaturas', 'fotos')
);

-- 9. POLÍTICA DE EXCLUSÃO (DELETE)
-- Permite que o operador remova uma foto ou comprovante caso cancele ou exclua um registro.
CREATE POLICY "PorttoHub Anon and Auth Deletes"
ON storage.objects FOR DELETE
USING (
    bucket_id IN ('encomendas', 'assinaturas', 'fotos')
);

-- ==============================================================================
-- ESTRUTURA DE PASTAS UTILIZADA PELO PORTTOHUB DENTRO DO BUCKET 'encomendas':
-- ==============================================================================
-- 1. etiquetas/            -> Fotos de pacotes e etiquetas registradas no recebimento
-- 2. assinaturas_encomendas/ -> Assinaturas digitais capturadas na entrega ao morador
-- 3. comprovantes_baixa/    -> Fotos de documento ou comprovante no momento da baixa
-- 4. avarias/              -> Fotos de encomendas com caixa danificada ou violada
-- 5. chaves/               -> Fotos de chaves e comprovantes de cautela de chaves
-- 6. custodia/             -> Fotos de itens retidos ou achados e perdidos
-- 7. manutencao/           -> Fotos de vistorias, manutenções prediais e ordens de serviço
-- 8. avarias_materiais/    -> Fotos de ferramentas danificadas ou devolvidas com defeito
-- 9. ocorrencias/          -> Fotos e evidências anexadas ao livro de ocorrências
-- 10. rondas_evidencias/   -> Fotos registradas pelos porteiros durante rondas
-- ==============================================================================

-- CONSULTA DE VERIFICAÇÃO FINAL:
SELECT 
    id AS bucket_nome,
    public AS publico,
    file_size_limit AS limite_bytes,
    allowed_mime_types AS tipos_permitidos,
    created_at AS criado_em
FROM storage.buckets
WHERE id IN ('encomendas', 'assinaturas', 'fotos');

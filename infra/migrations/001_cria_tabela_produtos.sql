-- Migration 001: Criação da tabela de produtos
-- Data: 2024-02-03
-- Autor: Sem Susto Team

-- Extensão para UUIDs (caso necessário em versões antigas, mas v13+ é nativo)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    codigo_barras VARCHAR(50) NOT NULL UNIQUE, -- GTIN/EAN como chave única de negócio
    
    -- Dados Descritivos
    descricao TEXT NOT NULL,
    marca VARCHAR(50) NOT NULL,
    tamanho VARCHAR(50) NOT NULL, -- Padronizado (ex: '2L', '500g')
    
    -- Multimídia e Preço
    imagem TEXT, -- URL ou Base64 (híbrido)
    preco_estimado NUMERIC(10,2) DEFAULT 0,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Performance
-- 1. Busca exata por código de barras ( essencial para o scanner)
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);

-- 2. Busca textual por nome (para o campo de pesquisa)
-- Utiliza índice GIN para Full Text Search performático em PT-BR
CREATE INDEX IF NOT EXISTS idx_produtos_descricao_fts 
ON produtos 
USING GIN (to_tsvector('portuguese', descricao));

-- Comentários para documentação (opcional, mas boa prática)
COMMENT ON TABLE produtos IS 'Catálogo mestre de produtos importado do OpenFoodFacts + User corrections';
COMMENT ON COLUMN produtos.codigo_barras IS 'GTIN/EAN-13 ou EAN-8 sem zeros à esquerda desnecessários';
COMMENT ON COLUMN produtos.descricao IS 'Descrição do produto';
COMMENT ON COLUMN produtos.marca IS 'Marca do produto';
COMMENT ON COLUMN produtos.tamanho IS 'Tamanho do produto';
COMMENT ON COLUMN produtos.imagem IS 'URL ou Base64 (híbrido)';
COMMENT ON COLUMN produtos.preco_estimado IS 'Preço estimado do produto';
COMMENT ON COLUMN produtos.criado_em IS 'Data de criação do registro';
COMMENT ON COLUMN produtos.atualizado_em IS 'Data de atualização do registro';

-- Migration 000: Tabela de controle de migrations
-- Data: 2024-02-05
-- Autor: Sem Susto Team
--
-- Esta tabela registra quais migrations já foram aplicadas ao banco.
-- Isso permite executar o init_db.py múltiplas vezes sem erros,
-- pois só aplica migrations novas (idempotência).

CREATE TABLE IF NOT EXISTS schema_migrations (
    -- Nome do arquivo da migration (ex: '001_cria_tabela_produtos.sql')
    migration_id VARCHAR(255) PRIMARY KEY,
    
    -- Quando a migration foi aplicada
    aplicada_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE schema_migrations IS 'Controle de versão das migrations aplicadas ao banco';

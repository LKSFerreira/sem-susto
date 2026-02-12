-- Migration 002: Tabela de tokens premium
-- Data: 2026-02-11
-- Autor: Sem Susto Team
--
-- Armazena tokens gerados após confirmação de pagamento.
-- O token em si NUNCA é armazenado — apenas seu hash SHA-256.
-- Isso garante conformidade com LGPD (seção 7 de monetizacao.md).

CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hash SHA-256 do token (ex: hash de "SEM-SUSTO-A7X9K2B")
    -- O token em texto puro só existe no momento da entrega ao usuário
    token_hash VARCHAR(64) UNIQUE NOT NULL,

    -- Plano contratado: define a duração do acesso premium
    -- 'trial' é reservado para tokens gerados manualmente via CLI (cortesia/testes)
    plano VARCHAR(20) NOT NULL,

    -- Ciclo de vida: valido → ativo → expirado
    -- 'valido': token gerado, aguardando primeira ativação (sem countdown)
    -- 'ativo': countdown iniciado a partir de ativado_em
    -- 'expirado': funcionalidades voltam ao modo gratuito
    status VARCHAR(20) NOT NULL DEFAULT 'valido',

    -- Duração em dias do acesso premium (15, 30, 60 ou custom para trial)
    -- Armazenado explicitamente para permitir recalcular expira_em se necessário
    duracao_dias INTEGER NOT NULL,

    -- Metadados temporais
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- NULL até a primeira ativação em um dispositivo
    ativado_em TIMESTAMP WITH TIME ZONE,

    -- Calculado em runtime: ativado_em + duracao_dias
    -- NULL enquanto o token não foi ativado
    expira_em TIMESTAMP WITH TIME ZONE,

    -- Constraints de validação
    -- Garante que apenas valores válidos sejam aceitos nos campos críticos
    CONSTRAINT chk_tokens_plano CHECK (plano IN ('cafe', 'lanche', 'apoiador', 'trial')),
    CONSTRAINT chk_tokens_status CHECK (status IN ('valido', 'ativo', 'expirado'))
);

-- Índice para busca rápida por token_hash durante ativação
-- Essencial: toda ativação faz SELECT WHERE token_hash = ?
CREATE INDEX IF NOT EXISTS idx_tokens_token_hash ON tokens(token_hash);

-- Documentação das colunas
COMMENT ON TABLE tokens IS 'Tokens premium anônimos gerados após confirmação de pagamento via PIX';
COMMENT ON COLUMN tokens.token_hash IS 'SHA-256 do token SEM-SUSTO-XXXXXXX (nunca armazenamos o token em texto puro)';
COMMENT ON COLUMN tokens.plano IS 'Plano contratado: cafe (15d), lanche (30d), apoiador (60d) ou trial (custom)';
COMMENT ON COLUMN tokens.status IS 'Ciclo de vida: valido (aguarda ativação) → ativo (countdown) → expirado';
COMMENT ON COLUMN tokens.duracao_dias IS 'Duração do acesso premium em dias';
COMMENT ON COLUMN tokens.criado_em IS 'Momento da geração do token (após pagamento confirmado)';
COMMENT ON COLUMN tokens.ativado_em IS 'Momento da primeira ativação em um dispositivo (inicia countdown)';
COMMENT ON COLUMN tokens.expira_em IS 'Data de expiração calculada: ativado_em + duracao_dias';

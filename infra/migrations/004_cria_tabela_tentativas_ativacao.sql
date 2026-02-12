-- Migration 004: Tabela de auditoria de tentativas de ativação
-- Data: 2026-02-11
-- Autor: Sem Susto Team (via Claude Opus 4.6)
--
-- Log append-only de TODAS as tentativas de ativação.
-- Essencial para Rate Limiting e detecção de ataques de força bruta.
-- NENHUM dado pessoal identificável é armazenado (apenas hashes).

CREATE TABLE IF NOT EXISTS tentativas_ativacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificadores da origem (Hashes SHA-256)
    -- Necessários para aplicar ban temporário por IP ou fingerprint
    ip_hash VARCHAR(64) NOT NULL,
    user_agent_hash VARCHAR(64) NOT NULL,
    fingerprint_hash VARCHAR(64), -- Pode ser NULL se o ataque ocorrer antes do cálculo de fingerprint

    -- O hash do token que tentaram utilizar.
    -- IMPORTANTE: SEM Foreign Key.
    -- Motivo: Precisamos registrar tentativas de tokens INEXISTENTES (ataques de guess).
    -- Se houvesse FK, o INSERT falharia e perderíamos o rastro do ataque.
    token_hash_tentado VARCHAR(64),

    -- Resultado da operação
    -- Ex: 'sucesso', 'token_inexistente', 'bloqueado_rate_limit', 'bloqueado_limite_devices'
    resultado VARCHAR(50) NOT NULL,

    -- Indíce temporal para Rate Limiting
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice composto CRÍTICO para performance do Rate Limiting
-- Permite responder muito rápido à pergunta:
-- "Quantas tentativas este IP (ip_hash) fez na última hora (criado_em > NOW() - 1h)?"
CREATE INDEX IF NOT EXISTS idx_tentativas_rate_limiting 
ON tentativas_ativacao (ip_hash, criado_em);

-- Comentários
COMMENT ON TABLE tentativas_ativacao IS 'Log de segurança e auditoria para tentativas de ativação de tokens';
COMMENT ON COLUMN tentativas_ativacao.ip_hash IS 'Hash do IP de origem (Anonimizado)';
COMMENT ON COLUMN tentativas_ativacao.token_hash_tentado IS 'Token submetido (pode não existir no banco)';
COMMENT ON COLUMN tentativas_ativacao.resultado IS 'Desfecho da tentativa (sucesso/falha/motivo)';

-- Migration 003: Tabela de dispositivos vinculados
-- Data: 2026-02-11
-- Autor: Sem Susto Team (via Claude Opus 4.6)
--
-- Controla o limite de dispositivos por token (Regra: Máximo 2)
-- A unicidade é garantida pelo par (token_hash, fingerprint_hash).

CREATE TABLE IF NOT EXISTS dispositivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Token ao qual o dispositivo está vinculado
    -- ON DELETE CASCADE: Se o token for removido (ex: expurgo LGPD), remove os vínculos
    token_hash VARCHAR(64) NOT NULL REFERENCES tokens(token_hash) ON DELETE CASCADE,

    -- Identificador único do dispositivo (gerado no frontend e hash no backend)
    -- Hash SHA-256 de: tela + user-agent + timezone + idioma + entropy
    fingerprint_hash VARCHAR(64) NOT NULL,

    -- Data do vínculo. Diferente de 'ativado_em' do token.
    -- Um token pode ser ativado hoje, mas um segundo dispositivo ser vinculado amanhã.
    vinculado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Garante que o mesmo dispositivo não ocupe 2 slots no mesmo token
    CONSTRAINT uk_dispositivos_token_fingerprint UNIQUE (token_hash, fingerprint_hash)
);

-- Comentários para documentação do schema
COMMENT ON TABLE dispositivos IS 'Registro de dispositivos vinculados a um token. Limite de 2 por token.';
COMMENT ON COLUMN dispositivos.token_hash IS 'Referência ao token proprietário';
COMMENT ON COLUMN dispositivos.fingerprint_hash IS 'Assinatura única do dispositivo para evitar duplicidade de slots';
COMMENT ON COLUMN dispositivos.vinculado_em IS 'Data em que este dispositivo específico foi vinculado';

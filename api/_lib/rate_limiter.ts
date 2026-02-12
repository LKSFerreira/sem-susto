import { createHash } from 'crypto';
import pool from './banco';

/**
 * Rate Limiter baseado na tabela `tentativas_ativacao`.
 *
 * Protege contra brute force consultando quantas tentativas
 * o IP fez na última hora. Não usa cache em memória — cada
 * invocação serverless é efêmera, então o banco é a fonte da verdade.
 */

/** Máximo de tentativas de ativação por IP por hora */
const MAXIMO_TENTATIVAS_POR_HORA = 5;

/** Tentativas com tokens inexistentes que ativam bloqueio de 1h */
const MAXIMO_TENTATIVAS_INEXISTENTES = 10;

/**
 * Gera hash SHA-256 de um valor (IP, User-Agent, etc).
 *
 * Nunca armazenamos dados pessoais em texto puro — apenas hashes.
 * Isso garante conformidade com LGPD (seção 7 de monetizacao.md).
 *
 * @param valor - Texto a ser hasheado
 * @returns Hash SHA-256 em hexadecimal
 */
export function hashear(valor: string): string {
    return createHash('sha256').update(valor).digest('hex');
}

/**
 * Verifica se um IP está dentro do limite de tentativas permitidas.
 *
 * @param ipHash - Hash do IP do solicitante
 * @returns Objeto com `permitido` (boolean) e `motivo` (string) se bloqueado
 */
export async function verificarRateLimit(
    ipHash: string
): Promise<{ permitido: boolean; motivo?: string }> {
    // 1. Conta tentativas totais na última hora
    const resultadoTotal = await pool.query(
        `SELECT COUNT(*) as total
     FROM tentativas_ativacao
     WHERE ip_hash = $1
       AND criado_em > NOW() - INTERVAL '1 hour'`,
        [ipHash]
    );

    const totalTentativas = parseInt(resultadoTotal.rows[0].total, 10);

    if (totalTentativas >= MAXIMO_TENTATIVAS_POR_HORA) {
        return {
            permitido: false,
            motivo: 'Limite de tentativas atingido. Tente novamente em 1 hora.',
        };
    }

    // 2. Conta tentativas com tokens inexistentes (possível ataque de guess)
    const resultadoInexistentes = await pool.query(
        `SELECT COUNT(*) as total
     FROM tentativas_ativacao
     WHERE ip_hash = $1
       AND resultado = 'token_inexistente'
       AND criado_em > NOW() - INTERVAL '1 hour'`,
        [ipHash]
    );

    const totalInexistentes = parseInt(resultadoInexistentes.rows[0].total, 10);

    if (totalInexistentes >= MAXIMO_TENTATIVAS_INEXISTENTES) {
        return {
            permitido: false,
            motivo: 'IP temporariamente bloqueado por atividade suspeita.',
        };
    }

    return { permitido: true };
}

/**
 * Registra uma tentativa de ativação na tabela de auditoria.
 *
 * Toda tentativa é logada — sucesso ou falha — para permitir
 * análise posterior de padrões de ataque.
 *
 * @param dados - Dados da tentativa (todos hasheados)
 */
export async function registrarTentativa(dados: {
    ipHash: string;
    userAgentHash: string;
    fingerprintHash?: string;
    tokenHashTentado?: string;
    resultado: string;
}): Promise<void> {
    await pool.query(
        `INSERT INTO tentativas_ativacao
       (ip_hash, user_agent_hash, fingerprint_hash, token_hash_tentado, resultado)
     VALUES ($1, $2, $3, $4, $5)`,
        [
            dados.ipHash,
            dados.userAgentHash,
            dados.fingerprintHash || null,
            dados.tokenHashTentado || null,
            dados.resultado,
        ]
    );
}

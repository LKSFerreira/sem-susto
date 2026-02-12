import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../_lib/banco';
import { gerarCodigoToken, calcularHash, obterDuracaoPorPlano, planoEhValido } from '../_lib/tokens';

/**
 * Endpoint para gerar um novo token premium após confirmação de pagamento.
 *
 * **Uso:** POST /api/tokens/gerar
 * **Proteção:** Header `X-API-Secret` obrigatório (impede acesso público)
 *
 * O token em texto puro é retornado APENAS nesta resposta.
 * No banco, armazenamos apenas o hash SHA-256 do token.
 *
 * @param req.body.plano - Plano contratado: "cafe", "lanche", "apoiador" ou "trial"
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Apenas POST é aceito
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    // Verifica o segredo de API (proteção contra acesso público)
    const segredoRecebido = req.headers['x-api-secret'];
    const segredoEsperado = process.env.API_SECRET;

    if (!segredoEsperado || segredoRecebido !== segredoEsperado) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    // Valida o body
    const { plano } = req.body || {};

    if (!plano || typeof plano !== 'string') {
        return res.status(400).json({ erro: 'Campo "plano" é obrigatório' });
    }

    if (!planoEhValido(plano)) {
        return res.status(400).json({ erro: 'Plano inválido. Aceitos: cafe, lanche, apoiador, trial' });
    }

    try {
        // Gera token e calcula hash
        const tokenTextoPuro = gerarCodigoToken();
        const tokenHash = calcularHash(tokenTextoPuro);
        const duracaoDias = obterDuracaoPorPlano(plano);

        // Insere no banco (apenas o hash — nunca o token em si)
        await pool.query(
            `INSERT INTO tokens (token_hash, plano, duracao_dias)
       VALUES ($1, $2, $3)`,
            [tokenHash, plano, duracaoDias]
        );

        // Retorna o token em texto puro — ÚNICA vez que ele é legível
        return res.status(201).json({
            token: tokenTextoPuro,
            plano,
            duracao_dias: duracaoDias,
        });
    } catch (erro: any) {
        console.error('[Tokens/Gerar] Erro:', erro.message);
        return res.status(500).json({ erro: 'Erro interno ao gerar token' });
    }
}

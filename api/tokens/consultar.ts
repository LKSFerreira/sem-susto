import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../_lib/banco';
import { calcularHash, formatoTokenEhValido } from '../_lib/tokens';

/**
 * Endpoint para consultar o status de um token premium.
 *
 * **Uso:** GET /api/tokens/consultar?token=SEM-SUSTO-A7X9K2B
 *
 * Usado raramente — o frontend armazena os dados no localStorage
 * e só reconsulta quando o token está perto de expirar (últimas 24h).
 *
 * Realiza expiração lazy: se o token deveria ter expirado,
 * atualiza o status no banco antes de responder.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    // Extrai token da query string
    const token = req.query.token as string;

    if (!token) {
        return res.status(400).json({ erro: 'Parâmetro "token" é obrigatório' });
    }

    if (!formatoTokenEhValido(token)) {
        return res.status(400).json({ erro: 'Formato de token inválido' });
    }

    const tokenHash = calcularHash(token);

    try {
        // Busca token no banco
        const resultado = await pool.query(
            'SELECT plano, status, duracao_dias, ativado_em, expira_em FROM tokens WHERE token_hash = $1',
            [tokenHash]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Token não encontrado' });
        }

        const tokenDados = resultado.rows[0];

        // Expiração lazy: atualiza status se passou da data
        if (tokenDados.status === 'ativo' && tokenDados.expira_em && new Date(tokenDados.expira_em) < new Date()) {
            await pool.query(
                'UPDATE tokens SET status = $1 WHERE token_hash = $2',
                ['expirado', tokenHash]
            );
            tokenDados.status = 'expirado';
        }

        // Calcula dias restantes (0 se expirado ou não ativado)
        let diasRestantes = 0;

        if (tokenDados.status === 'ativo' && tokenDados.expira_em) {
            diasRestantes = Math.max(
                0,
                Math.ceil((new Date(tokenDados.expira_em).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            );
        } else if (tokenDados.status === 'valido') {
            // Ainda não ativado — mostra duração total
            diasRestantes = tokenDados.duracao_dias;
        }

        return res.status(200).json({
            status: tokenDados.status,
            plano: tokenDados.plano,
            dias_restantes: diasRestantes,
            expira_em: tokenDados.expira_em,
        });
    } catch (erro: any) {
        console.error('[Tokens/Consultar] Erro:', erro.message);
        return res.status(500).json({ erro: 'Erro interno' });
    }
}

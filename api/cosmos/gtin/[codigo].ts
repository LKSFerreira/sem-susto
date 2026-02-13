import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy para busca de produto por GTIN na API Bluesoft Cosmos.
 *
 * Resolve problema de CORS em produção, fazendo a requisição
 * server-side e retornando o JSON para o frontend.
 *
 * **Uso:** GET /api/cosmos/gtin/7891910000197
 *
 * :param codigo: Código GTIN do produto (13 dígitos)
 * :returns: Dados do produto em JSON ou erro
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Extrai o código GTIN da URL
    const { codigo } = req.query;

    // Valida se o código foi informado
    if (!codigo || typeof codigo !== 'string') {
        return res.status(400).json({ error: 'Código GTIN não informado' });
    }

    // Token vem das variáveis de ambiente da Vercel
    const cosmosToken = process.env.COSMOS_TOKEN;

    if (!cosmosToken) {
        return res.status(500).json({ error: 'Token COSMOS não configurado no servidor' });
    }

    try {
        // Faz a requisição para a API Cosmos (server-side, sem CORS)
        const response = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${codigo}.json`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Cosmos-API-Request',
                'Content-Type': 'application/json',
                'X-Cosmos-Token': cosmosToken,
            },
        });

        // Repassa status code de erro
        if (!response.ok) {
            return res.status(response.status).json({
                error: `API Cosmos retornou ${response.status}`,
            });
        }

        const data = await response.json();

        // Define headers CORS para permitir qualquer origem
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');

        return res.status(200).json(data);
    } catch (error: any) {
        console.error('[Proxy Cosmos] Erro:', error.message);
        return res.status(500).json({ error: 'Falha ao consultar API Cosmos' });
    }
}

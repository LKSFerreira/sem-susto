/**
 * Teste para o proxy Cosmos.
 * Valida se o handler consegue ler a variável COSMOS_TOKEN (agora sem prefixo VITE_).
 *
 * Uso: npx tsx scripts/testar_proxy_cosmos.ts
 */

import handler from '../api/cosmos/gtin/[codigo]';

// Mock de Request
const req = {
    method: 'GET',
    query: {
        codigo: '7894900011517' // Coca-Cola 350ml (Exemplo comum)
    },
    headers: {}
} as any;

// Mock de Response
const res = {
    status: (code: number) => {
        console.log(`[Teste Cosmos] Status Code: ${code}`);
        return res;
    },
    json: (data: any) => {
        console.log('[Teste Cosmos] Response Body:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
        return res;
    },
    setHeader: (name: string, value: string) => {
        // console.log(`[Teste Cosmos] Set Header: ${name}=${value}`);
        return res;
    }
} as any;

async function run() {
    console.log('--- Iniciando teste do Proxy Cosmos ---');
    console.log('Variável COSMOS_TOKEN:', process.env.COSMOS_TOKEN ? 'DEFINIDA ✅' : 'AUSENTE ❌');

    // Se estiver rodando localmente sem env carregar, a gente injeta pra validar a lógica
    // Mas no Docker a env já deve estar lá se o compose carregar o .env
    // process.env.COSMOS_TOKEN = process.env.COSMOS_TOKEN || '...';

    try {
        await handler(req, res);
    } catch (err) {
        console.error('Erro na execução do handler:', err);
    }

    console.log('--- Fim do teste ---');
}

run();

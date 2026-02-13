/**
 * Teste simples para o proxy de IA.
 * Tenta chamar o handler diretamente (mockando req/res) para ver se ele
 * inicia a comunicação com a Groq.
 *
 * Uso: npx tsx scripts/testar_proxy_ia.ts
 */

import handler from '../api/ia/analisar';

// Mock de Request
const req = {
    method: 'POST',
    body: {
        tipo: 'texto',
        conteudo: 'Teste de conexão com o proxy de IA'
    },
    headers: {}
} as any;

// Mock de Response
const res = {
    status: (code: number) => {
        console.log(`[Teste] Status Code: ${code}`);
        return res;
    },
    json: (data: any) => {
        console.log('[Teste] Response Body:', JSON.stringify(data, null, 2));
        return res;
    }
} as any;

async function run() {
    console.log('--- Iniciando teste do Proxy IA ---');

    // Configura variável de ambiente (mockada para teste)
    process.env.GROQ_TOKEN = process.env.GROQ_TOKEN || 'gsk_TESTE_MOCK_TOKEN';

    try {
        await handler(req, res);
    } catch (err) {
        console.error('Erro na execução do handler:', err);
    }

    console.log('--- Fim do teste ---');
}

run();

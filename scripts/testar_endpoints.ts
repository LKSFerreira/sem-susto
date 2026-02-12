/**
 * Script de teste para os endpoints de tokens.
 *
 * Testa os 3 handlers (gerar, ativar, consultar) chamando
 * as funções diretamente com objetos mock de req/res.
 *
 * Uso: npx tsx scripts/testar_endpoints.ts
 */

// Configura variável de ambiente necessária antes de importar os handlers
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/sem_susto';
process.env.API_SECRET = process.env.API_SECRET || 'segredo_teste_local';

import gerarHandler from '../api/tokens/gerar';
import ativarHandler from '../api/tokens/ativar';
import consultarHandler from '../api/tokens/consultar';

/**
 * Cria um objeto mock que simula VercelRequest.
 */
function criarReqMock(opcoes: {
    method: string;
    body?: any;
    query?: Record<string, string>;
    headers?: Record<string, string>;
}) {
    return {
        method: opcoes.method,
        body: opcoes.body || {},
        query: opcoes.query || {},
        headers: {
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'teste-local',
            ...opcoes.headers,
        },
    } as any;
}

/**
 * Cria um objeto mock que simula VercelResponse.
 * Captura o status e o body para inspeção.
 */
function criarResMock() {
    let _status = 200;
    let _body: any = null;

    const res = {
        status(codigo: number) {
            _status = codigo;
            return res;
        },
        json(dados: any) {
            _body = dados;
            return res;
        },
        obterResultado() {
            return { status: _status, body: _body };
        },
    };

    return res as any;
}

// =============================================================================
// TESTES
// =============================================================================

async function executarTestes() {
    let tokenGerado = '';

    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTANDO ENDPOINTS DE TOKENS');
    console.log('='.repeat(60));

    // ─── TESTE 1: Gerar sem segredo (deve falhar) ────────────────────────
    {
        console.log('\n📋 Teste 1: POST /api/tokens/gerar SEM segredo');
        const req = criarReqMock({ method: 'POST', body: { plano: 'trial' } });
        const res = criarResMock();
        await gerarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(`   ${resultado.status === 403 ? '✅ PASSOU' : '❌ FALHOU'} (esperado 403)`);
    }

    // ─── TESTE 2: Gerar com segredo correto ──────────────────────────────
    {
        console.log('\n📋 Teste 2: POST /api/tokens/gerar COM segredo');
        const req = criarReqMock({
            method: 'POST',
            body: { plano: 'lanche' },
            headers: { 'x-api-secret': 'segredo_teste_local' },
        });
        const res = criarResMock();
        await gerarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);

        if (resultado.status === 201 && resultado.body?.token) {
            tokenGerado = resultado.body.token;
            console.log(`   ✅ PASSOU — Token: ${tokenGerado}`);
        } else {
            console.log(`   ❌ FALHOU (esperado 201)`);
            return;
        }
    }

    // ─── TESTE 3: Gerar com plano inválido ───────────────────────────────
    {
        console.log('\n📋 Teste 3: POST /api/tokens/gerar com plano inválido');
        const req = criarReqMock({
            method: 'POST',
            body: { plano: 'premium_vip_gold' },
            headers: { 'x-api-secret': 'segredo_teste_local' },
        });
        const res = criarResMock();
        await gerarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(`   ${resultado.status === 400 ? '✅ PASSOU' : '❌ FALHOU'} (esperado 400)`);
    }

    // ─── TESTE 4: Ativar token recém-gerado ──────────────────────────────
    {
        console.log('\n📋 Teste 4: POST /api/tokens/ativar (primeira ativação)');
        const req = criarReqMock({
            method: 'POST',
            body: { token: tokenGerado, fingerprint: 'dispositivo-teste-01' },
        });
        const res = criarResMock();
        await ativarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(
            `   ${resultado.status === 200 && resultado.body?.status === 'ativo' ? '✅ PASSOU' : '❌ FALHOU'} (esperado 200, status=ativo)`
        );
    }

    // ─── TESTE 5: Ativar mesmo dispositivo novamente (deve funcionar) ────
    {
        console.log('\n📋 Teste 5: POST /api/tokens/ativar (mesmo dispositivo)');
        const req = criarReqMock({
            method: 'POST',
            body: { token: tokenGerado, fingerprint: 'dispositivo-teste-01' },
        });
        const res = criarResMock();
        await ativarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(`   ${resultado.status === 200 ? '✅ PASSOU' : '❌ FALHOU'} (esperado 200)`);
    }

    // ─── TESTE 6: Ativar token inexistente ───────────────────────────────
    {
        console.log('\n📋 Teste 6: POST /api/tokens/ativar (token inexistente)');
        const req = criarReqMock({
            method: 'POST',
            body: { token: 'SEM-SUSTO-ZZZZZZZ', fingerprint: 'dispositivo-teste-01' },
        });
        const res = criarResMock();
        await ativarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(`   ${resultado.status === 404 ? '✅ PASSOU' : '❌ FALHOU'} (esperado 404)`);
    }

    // ─── TESTE 7: Consultar token ativo ──────────────────────────────────
    {
        console.log('\n📋 Teste 7: GET /api/tokens/consultar (token ativo)');
        const req = criarReqMock({
            method: 'GET',
            query: { token: tokenGerado },
        });
        const res = criarResMock();
        await consultarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(
            `   ${resultado.status === 200 && resultado.body?.dias_restantes > 0 ? '✅ PASSOU' : '❌ FALHOU'} (esperado 200, dias_restantes > 0)`
        );
    }

    // ─── TESTE 8: Consultar token inexistente ────────────────────────────
    {
        console.log('\n📋 Teste 8: GET /api/tokens/consultar (token inexistente)');
        const req = criarReqMock({
            method: 'GET',
            query: { token: 'SEM-SUSTO-ZZZZZZZ' },
        });
        const res = criarResMock();
        await consultarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(`   ${resultado.status === 404 ? '✅ PASSOU' : '❌ FALHOU'} (esperado 404)`);
    }

    // ─── TESTE 9: Formato de token inválido ──────────────────────────────
    {
        console.log('\n📋 Teste 9: POST /api/tokens/ativar (formato inválido)');
        const req = criarReqMock({
            method: 'POST',
            body: { token: 'token-qualquer-123', fingerprint: 'abc' },
        });
        const res = criarResMock();
        await ativarHandler(req, res);
        const resultado = res.obterResultado();
        console.log(`   Status: ${resultado.status} | Body:`, resultado.body);
        console.log(`   ${resultado.status === 400 ? '✅ PASSOU' : '❌ FALHOU'} (esperado 400)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 TESTES FINALIZADOS');
    console.log('='.repeat(60) + '\n');

    // Encerra o pool de conexões para o processo terminar
    const pool = (await import('../api/_lib/banco')).default;
    await pool.end();
}

executarTestes().catch((erro) => {
    console.error('❌ Erro fatal nos testes:', erro);
    process.exit(1);
});

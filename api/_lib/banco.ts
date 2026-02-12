import { Pool } from 'pg';

/**
 * Pool de conexões PostgreSQL para os endpoints serverless.
 *
 * Reutiliza conexões entre invocações na mesma instância serverless,
 * evitando o overhead de abrir/fechar conexão a cada requisição.
 *
 * A variável DATABASE_URL é configurada na Vercel (produção)
 * ou no compose.yaml (desenvolvimento local).
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // Serverless: limita conexões para não esgotar o pool do banco
    max: 5,

    // Fecha conexões ociosas após 30 segundos (liberando recursos)
    idleTimeoutMillis: 30000,

    // Timeout de 10 segundos para estabelecer conexão
    connectionTimeoutMillis: 10000,
});

export default pool;

import { createHash, randomBytes } from 'crypto';

/**
 * Charset Base30 — exclui caracteres ambíguos (0, O, 1, I, L)
 * que podem causar confusão ao digitar ou ler o token.
 *
 * Caracteres válidos: A-Z (sem I, L, O) + 2-9 (sem 0, 1)
 * Total: 23 letras + 7 dígitos = 30 caracteres
 */
const CHARSET_BASE30 = 'ABCDEFGHJKMNPQRSTUVWXYZ2345678';

/** Prefixo fixo de todos os tokens do Sem Susto */
const PREFIXO_TOKEN = 'SEM-SUSTO-';

/** Quantidade de caracteres aleatórios após o prefixo */
const TAMANHO_CODIGO = 7;

/** Mapeamento de plano para duração em dias */
const DURACAO_POR_PLANO: Record<string, number> = {
    cafe: 15,
    lanche: 30,
    apoiador: 60,
    trial: 7,
};

/** Planos aceitos pelo sistema */
const PLANOS_VALIDOS = Object.keys(DURACAO_POR_PLANO);

/**
 * Gera um código de token aleatório no formato SEM-SUSTO-XXXXXXX.
 *
 * Usa `crypto.randomBytes` (CSPRNG) para garantir aleatoriedade
 * criptograficamente segura — importante para evitar previsibilidade.
 *
 * @returns Token em texto puro (ex: "SEM-SUSTO-A7X9K2B")
 */
export function gerarCodigoToken(): string {
    const bytes = randomBytes(TAMANHO_CODIGO);
    let codigo = '';

    for (let i = 0; i < TAMANHO_CODIGO; i++) {
        // Usa módulo do byte para selecionar um caractere do charset
        codigo += CHARSET_BASE30[bytes[i] % CHARSET_BASE30.length];
    }

    return `${PREFIXO_TOKEN}${codigo}`;
}

/**
 * Calcula o hash SHA-256 de um token em texto puro.
 *
 * O hash é o que armazenamos no banco — nunca o token em si.
 * Isso garante que mesmo com acesso ao banco, não é possível
 * recuperar os tokens originais.
 *
 * @param token - Token em texto puro (ex: "SEM-SUSTO-A7X9K2B")
 * @returns Hash SHA-256 em hexadecimal (64 caracteres)
 */
export function calcularHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Retorna a duração em dias para um plano válido.
 *
 * @param plano - Nome do plano (cafe, lanche, apoiador, trial)
 * @returns Duração em dias
 * @throws Error se o plano não for válido
 */
export function obterDuracaoPorPlano(plano: string): number {
    const duracao = DURACAO_POR_PLANO[plano];

    if (duracao === undefined) {
        throw new Error(`Plano inválido: "${plano}". Válidos: ${PLANOS_VALIDOS.join(', ')}`);
    }

    return duracao;
}

/**
 * Valida se um plano é aceito pelo sistema.
 *
 * @param plano - Nome do plano a validar
 * @returns true se o plano é válido
 */
export function planoEhValido(plano: string): boolean {
    return PLANOS_VALIDOS.includes(plano);
}

/**
 * Valida se um token tem o formato correto (SEM-SUSTO-XXXXXXX).
 *
 * Não verifica se o token existe no banco — apenas o formato.
 * Útil para rejeitar requests mal formados antes de tocar no banco.
 *
 * @param token - Token a validar
 * @returns true se o formato é válido
 */
export function formatoTokenEhValido(token: string): boolean {
    // Regex: prefixo + exatamente 7 caracteres do charset base30
    const regex = /^SEM-SUSTO-[ABCDEFGHJKMNPQRSTUVWXYZ2345678]{7}$/;
    return regex.test(token);
}

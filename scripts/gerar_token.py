"""
Script CLI para gerar tokens trial manualmente.

Uso dentro do container processor:

    python scripts/gerar_token.py --plano trial --duracao 7

Insere diretamente no banco PostgreSQL local via DATABASE_URL.
Útil para testes e para dar acesso cortesia a usuários específicos.
"""
import argparse
import hashlib
import os
import sys
import secrets

from dotenv import load_dotenv

# Carrega variáveis do arquivo .env de desenvolvimento
load_dotenv('.env.development')

# Importar psycopg2 para conexão com PostgreSQL
try:
    import psycopg2
except ImportError:
    print('❌ psycopg2 não encontrado. Instale com: pip install psycopg2-binary')
    sys.exit(1)


# =============================================================================
# CONFIGURAÇÃO
# =============================================================================

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print('❌ DATABASE_URL não definida no .env.development')
    sys.exit(1)

# Charset Base30 — mesmos caracteres usados no TypeScript (api/_lib/tokens.ts)
# Exclui ambíguos: 0, O, 1, I, L
CHARSET_BASE30 = 'ABCDEFGHJKMNPQRSTUVWXYZ2345678'

PREFIXO_TOKEN = 'SEM-SUSTO-'
TAMANHO_CODIGO = 7

# Mapeamento plano → duração padrão (pode ser sobrescrito via --duracao)
DURACAO_POR_PLANO = {
    'cafe': 15,
    'lanche': 30,
    'apoiador': 60,
    'trial': 7,
}


def gerar_codigo_token() -> str:
    """
    Gera um código de token aleatório no formato SEM-SUSTO-XXXXXXX.

    Usa secrets.choice (CSPRNG) para garantir aleatoriedade
    criptograficamente segura.

    :return: Token em texto puro (ex: "SEM-SUSTO-A7X9K2B")
    """
    codigo = ''.join(secrets.choice(CHARSET_BASE30) for _ in range(TAMANHO_CODIGO))
    return f'{PREFIXO_TOKEN}{codigo}'


def calcular_hash(token: str) -> str:
    """
    Calcula o hash SHA-256 de um token em texto puro.

    :param token: Token em texto puro
    :return: Hash SHA-256 em hexadecimal (64 caracteres)
    """
    return hashlib.sha256(token.encode()).hexdigest()


def main():
    """Função principal do script CLI."""
    parser = argparse.ArgumentParser(
        description='Gerar token premium para o Sem Susto'
    )
    parser.add_argument(
        '--plano',
        choices=list(DURACAO_POR_PLANO.keys()),
        default='trial',
        help='Plano do token (padrão: trial)',
    )
    parser.add_argument(
        '--duracao',
        type=int,
        default=None,
        help='Duração em dias (sobrescreve padrão do plano)',
    )

    argumentos = parser.parse_args()

    plano = argumentos.plano
    duracao_dias = argumentos.duracao or DURACAO_POR_PLANO[plano]

    # Gera o token
    token_texto_puro = gerar_codigo_token()
    token_hash = calcular_hash(token_texto_puro)

    print(f'\n🔑 Gerando token...')
    print(f'   Plano: {plano}')
    print(f'   Duração: {duracao_dias} dias')
    print(f'   Token: {token_texto_puro}')
    print(f'   Hash: {token_hash[:16]}...')

    # Insere no banco
    try:
        conexao = psycopg2.connect(dsn=DATABASE_URL)
        cursor = conexao.cursor()

        cursor.execute(
            """
            INSERT INTO tokens (token_hash, plano, duracao_dias)
            VALUES (%s, %s, %s)
            """,
            (token_hash, plano, duracao_dias),
        )

        conexao.commit()
        cursor.close()
        conexao.close()

        print(f'\n✅ Token inserido no banco com sucesso!')
        print(f'\n📋 Para ativar, use:')
        print(f'   https://semsusto.app/ativar/{token_texto_puro}')

    except Exception as erro:
        print(f'\n❌ Erro ao inserir no banco: {erro}')
        sys.exit(1)


if __name__ == '__main__':
    main()

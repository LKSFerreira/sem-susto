"""
Script de inicialização do banco de dados PostgreSQL.

Executa migrations de forma idempotente (pode rodar múltiplas vezes sem erros)
e importa dados do arquivo JSON de produtos higienizados.

**Exemplo:**

.. code-block:: bash

    # Dentro do container
    python scripts/init_db.py

    # Para resetar o banco completamente, altere RESETAR_BANCO para True
"""
import psycopg2
from psycopg2.extras import execute_values
import json
import os
import time
import sys
from dotenv import load_dotenv
from urllib.parse import urlparse

# =============================================================================
# CONFIGURAÇÃO DE RESET
# =============================================================================
# Altere para True se quiser DROPAR todas as tabelas e recomeçar do zero.
# ⚠️ CUIDADO: Isso apaga TODOS os dados do banco!
RESETAR_BANCO = False
AMBIENTE = os.getenv("PG_ENV")

# =============================================================================
# CONFIGURAÇÃO DE CONEXÃO
# =============================================================================
# Carrega variáveis do arquivo .env de desenvolvimento
load_dotenv(".env.development")

# Pega a Connection String (Fonte da Verdade)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ Erro: DATABASE_URL não definida no .env.development")
    sys.exit(1)


def parse_db_url(url: str) -> dict:
    """
    Parseia a URL de conexão do PostgreSQL para obter credenciais individuais.
    
    :param url: URL de conexão no formato postgresql://user:pass@host:port/db
    :return: Dicionário com host, port, user, password e database
    """
    result = urlparse(url)
    return {
        "host": result.hostname,
        "port": result.port or 5432,
        "user": result.username,
        "password": result.password,
        "database": result.path.lstrip("/")
    }


DB_CONFIG = parse_db_url(DATABASE_URL)
MIGRATIONS_DIR = "infra/migrations"
DATASET_FILE = "produtos_higienizados.json"


def create_database_if_not_exists():
    """Cria o banco de dados da aplicação se não existir."""
    target_db = DB_CONFIG["database"]
    print(f"🔨 Verificando banco de dados '{target_db}'...")
    
    try:
        # Conecta no banco administrativo 'postgres' para criar o novo
        conn = psycopg2.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database="postgres" # Banco default de admin
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Verifica se existe
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
        exists = cur.fetchone()
        
        if not exists:
            print(f"🆕 Criando banco de dados '{target_db}'...")
            cur.execute(f'CREATE DATABASE "{target_db}"')
            print("✅ Banco criado com sucesso!")
        else:
            print(f"ℹ️ Banco '{target_db}' já existe.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao verificar/criar banco: {e}")


def get_connection():
    """
    Tenta conectar ao banco usando a DATABASE_URL.
    Implementa retry com backoff para aguardar o container do Postgres subir.
    """
    retries = 30
    while retries > 0:
        try:
            conn = psycopg2.connect(dsn=DATABASE_URL)
            print("✅ Conectado ao PostgreSQL!")
            return conn
        except psycopg2.OperationalError as e:
            if "does not exist" in str(e):
                create_database_if_not_exists()
            else:
                print(f"⏳ Aguardando banco... ({retries}) Erro: {e}")
            
            time.sleep(1)
            retries -= 1
    
    print("❌ Erro: Timeout de conexão.")
    sys.exit(1)


def reset_database(conn):
    """
    Dropa TODAS as tabelas do banco de dados.
    ⚠️ Operação destrutiva! Use apenas em desenvolvimento.
    """
    print("🗑️ RESETANDO BANCO DE DADOS...")
    print("   ⚠️ Dropando todas as tabelas...")
    
    cur = conn.cursor()
    
    # Obtém lista de todas as tabelas do schema public
    cur.execute("""
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    """)
    tabelas = cur.fetchall()
    
    if not tabelas:
        print("   ℹ️ Nenhuma tabela encontrada para dropar.")
    else:
        for (tabela,) in tabelas:
            print(f"   🗑️ Dropando: {tabela}")
            cur.execute(f'DROP TABLE IF EXISTS "{tabela}" CASCADE')
        
        conn.commit()
        print(f"   ✅ {len(tabelas)} tabela(s) dropada(s)!")
    
    cur.close()


def ensure_migrations_table(conn):
    """
    Garante que a tabela de controle de migrations existe.
    Essa tabela é necessária para verificar quais migrations já foram aplicadas.
    """
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            migration_id VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cur.close()


def migration_already_applied(conn, migration_id: str) -> bool:
    """
    Verifica se uma migration específica já foi aplicada.
    
    :param conn: Conexão ativa com o banco
    :param migration_id: Nome do arquivo da migration
    :return: True se já foi aplicada, False caso contrário
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM schema_migrations WHERE migration_id = %s",
        (migration_id,)
    )
    exists = cur.fetchone() is not None
    cur.close()
    return exists


def register_migration(conn, migration_id: str):
    """
    Registra uma migration como aplicada na tabela de controle.
    
    :param conn: Conexão ativa com o banco
    :param migration_id: Nome do arquivo da migration
    """
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO schema_migrations (migration_id) VALUES (%s)",
        (migration_id,)
    )
    conn.commit()
    cur.close()


def apply_migrations(conn):
    """
    Aplica todas as migrations pendentes em ordem alfabética.
    
    O sistema verifica cada migration contra a tabela schema_migrations.
    Migrations já aplicadas são puladas (idempotência).
    """
    print("🚀 Iniciando Migrations...")
    
    # Garante que a tabela de controle existe
    ensure_migrations_table(conn)
    
    # Lista arquivos .sql ordenados
    files = sorted([f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")])
    
    if not files:
        print("   ℹ️ Nenhuma migration encontrada.")
        return
    
    applied_count = 0
    skipped_count = 0
    
    for filename in files:
        # Verifica se já foi aplicada
        if migration_already_applied(conn, filename):
            print(f"   ⏭️ Já aplicada: {filename}")
            skipped_count += 1
            continue
        
        # Aplica a migration
        filepath = os.path.join(MIGRATIONS_DIR, filename)
        print(f"   📄 Aplicando: {filename}")
        
        cur = conn.cursor()
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                cur.execute(f.read())
                conn.commit()
                
                # Registra na tabela de controle
                register_migration(conn, filename)
                applied_count += 1
                
            except Exception as e:
                conn.rollback()
                # Se o erro for "já existe", ignora (para migrations não-idempotentes antigas)
                if "already exists" in str(e):
                    print(f"      ⚠️ Objeto já existe, registrando migration: {e}")
                    register_migration(conn, filename)
                    skipped_count += 1
                else:
                    print(f"   ❌ Falha na migration {filename}: {e}")
                    sys.exit(1)
        
        cur.close()
    
    print(f"✅ Migrations concluídas. Aplicadas: {applied_count}, Puladas: {skipped_count}")


def import_data(conn):
    """
    Importa dados do arquivo JSON para a tabela produtos.
    Usa ON CONFLICT para ignorar duplicatas (upsert).
    """
    if not os.path.exists(DATASET_FILE):
        print(f"ℹ️ Arquivo {DATASET_FILE} não encontrado. Pulando importação.")
        return

    print("📦 Iniciando importação de dados...")
    
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if not data:
        print("   ℹ️ Arquivo vazio.")
        return

    insert_query = """
        INSERT INTO produtos (codigo_barras, descricao, marca, tamanho, imagem, preco_estimado)
        VALUES %s
        ON CONFLICT (codigo_barras) DO NOTHING
    """
    
    values = []
    for item in data:
        # Trunca campos para respeitar limites do schema
        marca = (item.get("marca") or "Genérica")[:50]
        tamanho = (item.get("tamanho") or "Unidade")[:50]
        values.append((
            item["codigo_barras"],
            item["descricao"],
            marca,
            tamanho,
            item.get("imagem"),
            item.get("preco_estimado", 0)
        ))
    
    cur = conn.cursor()
    try:
        execute_values(cur, insert_query, values, page_size=1000)
        conn.commit()
        print(f"✅ Importados {len(values)} produtos com sucesso!")
    except Exception as e:
        conn.rollback()
        print(f"❌ Erro na importação: {e}")
    finally:
        cur.close()


def main():
    """Função principal que orquestra a inicialização do banco."""
    conn = get_connection()
    
    # Reset opcional (se habilitado)
    if RESETAR_BANCO and AMBIENTE == "development":
        reset_database(conn)
    
    apply_migrations(conn)
    import_data(conn)
    conn.close()
    
    print("\n🎉 Inicialização do banco concluída!")


if __name__ == "__main__":
    main()

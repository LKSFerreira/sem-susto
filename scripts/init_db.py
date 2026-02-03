import psycopg2
from psycopg2.extras import execute_values
import json
import os
import time
import sys
from dotenv import load_dotenv

# Carrega variáveis do arquivo .env de desenvolvimento
# O script roda dentro do container, onde o .env está montado na raiz /app
load_dotenv(".env.development")

from urllib.parse import urlparse

# Carrega variáveis
load_dotenv(".env.development")

# Pega a Connection String (Fonte da Verdade)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ Erro: DATABASE_URL não definida no .env.development")
    sys.exit(1)

# Parseia a URL para obter credenciais individuais quando necessário (ex: criar banco)
def parse_db_url(url):
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
    """Cria o banco de dados da aplicação se não existir"""
    target_db = DB_CONFIG["database"]
    print(f"🔨 Verificando banco de dados '{target_db}'...")
    
    try:
        # Conecta no banco administrativo 'postgres' para criar o novo
        # Usa as mesmas credenciais da URL
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
            cur.execute(f"CREATE DATABASE {target_db}")
            print("✅ Banco criado com sucesso!")
        else:
            print(f"ℹ️ Banco '{target_db}' já existe.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao verificar/criar banco: {e}")

def get_connection():
    """Tenta conectar usando a DATABASE_URL"""
    retries = 30
    while retries > 0:
        try:
            # Psycopg2 aceita a URL diretamente no parâmetro dsn
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

def apply_migrations(conn):
    # ... (manter implementação existente)
    print("🚀 Iniciando Migrations...")
    cur = conn.cursor()
    files = sorted([f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")])
    for filename in files:
        # ... (mesma lógica)
        filepath = os.path.join(MIGRATIONS_DIR, filename)
        print(f"   📄 Aplicando: {filename}")
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                cur.execute(f.read())
                conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"   ❌ Falha na migration {filename}: {e}")
                # Não aborta fatalmente se já existe ("relation already exists"), 
                # mas o ideal é o SQL ser idempotente (IF NOT EXISTS).
                # Como usamos IF NOT EXISTS no SQL, deve passar.
                if "already exists" not in str(e):
                     sys.exit(1)
                print(f"      (Ignorando erro de existência: {e})")

    cur.close()
    print("✅ Migrations concluídas.")

def import_data(conn):
    # ... (manter implementação existente)
    if not os.path.exists(DATASET_FILE):
        return

    print("📦 Iniciando importação de dados...")
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not data: return

    insert_query = """
        INSERT INTO produtos (codigo_barras, descricao, marca, tamanho, imagem, preco_estimado)
        VALUES %s
        ON CONFLICT (codigo_barras) DO NOTHING
    """
    
    values = []
    for item in data:
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
    conn = get_connection()
    apply_migrations(conn)
    import_data(conn)
    conn.close()

if __name__ == "__main__":
    main()

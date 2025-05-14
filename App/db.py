import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_USER = os.environ.get("DB_USER")
DB_PASSWORD = os.environ.get("DB_PASSWORD")
DB_NAME = os.environ.get("DB_NAME", "corsona")

if DB_USER is None:
    raise ValueError("A variável de ambiente DB_USER não está configurada.")
if DB_PASSWORD is None:
    raise ValueError("A variável de ambiente DB_PASSWORD não está configurada.")

def get_db_connection(database_name=DB_NAME):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=database_name
        )
        return conn
    except mysql.connector.Error as err:
        print(
            f"Error connecting to MySQL (Host: {DB_HOST}, User: {DB_USER}, DB: {database_name}): {err}"
        )
        return None
    except ValueError as ve:
        print(f"Configuration error: {ve}")
        return None

def check_column_exists(cursor, table_name, column_name):
    """Verifica se uma coluna existe na tabela"""
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = '{DB_NAME}' 
        AND TABLE_NAME = '{table_name}' 
        AND COLUMN_NAME = '{column_name}'
    """)
    return cursor.fetchone()[0] > 0

def init_db():
    try:
        conn_server = get_db_connection(database_name=None)

        if not conn_server:
            print(
                f"Could not connect to MySQL server (Host: {DB_HOST}, User: {DB_USER}). Please check your .env file and MySQL server status."
            )
            return

        cursor_server = conn_server.cursor()
        cursor_server.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`")
        print(f"Database '{DB_NAME}' checked/created.")
        cursor_server.close()
        conn_server.close()

        conn_db = get_db_connection(database_name=DB_NAME)

        if not conn_db:
            print(f"Could not connect to database '{DB_NAME}' after creation attempt.")
            return

        cursor_db = conn_db.cursor()
        cursor_db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                bio VARCHAR(150) DEFAULT NULL,
                avatar_path VARCHAR(255) DEFAULT NULL
            )
        """)

        # Verificando e adicionando a coluna avatar_position, se não existir
        if not check_column_exists(cursor_db, 'users', 'avatar_position'):
            cursor_db.execute("""
                ALTER TABLE users 
                ADD COLUMN avatar_position VARCHAR(50) DEFAULT '50% 50%'
            """)
            print("Column 'avatar_position' added to 'users' table.")

        # Verificando e adicionando a coluna avatar_size, se não existir
        if not check_column_exists(cursor_db, 'users', 'avatar_size'):
            cursor_db.execute("""
                ALTER TABLE users 
                ADD COLUMN avatar_size VARCHAR(20) DEFAULT 'cover'
            """)
            print("Column 'avatar_size' added to 'users' table.")

        print("Table 'users' checked/created.")
        cursor_db.close()
        conn_db.close()
        print("Database initialization completed successfully.")

    except mysql.connector.Error as err:
        print(f"Error during DB initialization: {err}")
    except ValueError as ve:
        print(f"Configuration error during DB initialization: {ve}")
    except Exception as e:
        print(f"An unexpected error occurred during DB initialization: {e}")
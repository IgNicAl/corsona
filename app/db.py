import mysql.connector
import os

DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '51190290')
DB_NAME = 'corsona'

def get_db_connection(database_name=None):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=database_name
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None

def init_db():
    try:
        conn = get_db_connection()
        if not conn:
            print("Could not connect to MySQL server to initialize database.")
            return
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        print(f"Database '{DB_NAME}' checked/created.")
        cursor.close()
        conn.close()

        conn = get_db_connection(database_name=DB_NAME)
        if not conn:
            print(f"Could not connect to database '{DB_NAME}' after creation attempt.")
            return
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        """)
        print("Table 'users' checked/created.")
        cursor.close()
        conn.close()
    except mysql.connector.Error as err:
        print(f"Error during DB initialization: {err}")
    except Exception as e:
        print(f"An unexpected error occurred during DB initialization: {e}")
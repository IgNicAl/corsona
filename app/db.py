import mysql.connector
from flask import current_app, g
from flask.cli import with_appcontext
import click

def get_db():
    if 'db' not in g:
        try:
            g.db = mysql.connector.connect(
                host=current_app.config['DB_HOST'],
                user=current_app.config['DB_USER'],
                password=current_app.config['DB_PASSWORD'],
                database=None
            )
            cursor = g.db.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{current_app.config['DB_NAME']}`")
            cursor.execute(f"USE `{current_app.config['DB_NAME']}`")
            cursor.close()
        except mysql.connector.Error as err:
            current_app.logger.error(f"Error connecting to MySQL or creating/selecting database: {err}")
            raise
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None and db.is_connected():
        db.close()

def _check_column_exists(cursor, db_name, table_name, column_name):
    cursor.execute(f"""
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s
        AND TABLE_NAME = %s
        AND COLUMN_NAME = %s
    """, (db_name, table_name, column_name))
    return cursor.fetchone()[0] > 0

def _add_unique_constraint_if_not_exists(cursor, db_name, table_name, column_name, constraint_name):
    # Verificar se a constraint já existe
    cursor.execute(f"""
        SELECT COUNT(*)
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = %s
        AND TABLE_NAME = %s
        AND CONSTRAINT_NAME = %s
        AND CONSTRAINT_TYPE = 'UNIQUE'
    """, (db_name, table_name, constraint_name))
    exists = cursor.fetchone()[0] > 0

    if not exists:
        try:
            cursor.execute(f"ALTER TABLE {table_name} ADD CONSTRAINT {constraint_name} UNIQUE ({column_name})")
            current_app.logger.info(f"Added UNIQUE constraint {constraint_name} to {table_name}.{column_name}")
        except mysql.connector.Error as err:
            # Error 1061: Duplicate key name 'rg' (ou o nome da constraint) - significa que a constraint já existe, talvez com outro nome mas na mesma coluna.
            # Error 1062: Duplicate entry 'valor' for key 'rg' - significa que há dados duplicados.
            if err.errno == 1061: # Constraint já existe (talvez com outro nome mas na mesma coluna)
                 current_app.logger.warning(f"Could not add UNIQUE constraint {constraint_name} to {table_name}.{column_name}, it might already exist or column has an index: {err}")
            elif err.errno == 1062: # Duplicate data
                 current_app.logger.error(f"Could not add UNIQUE constraint {constraint_name} to {table_name}.{column_name} due to duplicate data: {err}. Manual data cleaning required.")
            else:
                 current_app.logger.error(f"Error adding UNIQUE constraint {constraint_name} to {table_name}.{column_name}: {err}")
    else:
        current_app.logger.info(f"UNIQUE constraint {constraint_name} on {table_name}.{column_name} already exists.")


def _init_db_tables():
    db = get_db()
    cursor = db.cursor(dictionary=True) # Usar dictionary=True para _check_column_exists, mas não para DDLs simples.
                                      # Reverter para cursor normal para DDLs
    cursor = db.cursor()
    db_name = current_app.config['DB_NAME']

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            bio VARCHAR(150) DEFAULT NULL,
            avatar_path VARCHAR(255) DEFAULT NULL,
            avatar_position VARCHAR(50) DEFAULT '50% 50%',
            avatar_size VARCHAR(20) DEFAULT 'cover'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS artists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            bio VARCHAR(150) DEFAULT NULL,
            avatar_path VARCHAR(255) DEFAULT NULL,
            avatar_position VARCHAR(50) DEFAULT '50% 50%',
            avatar_size VARCHAR(20) DEFAULT 'cover',
            rg VARCHAR(20) DEFAULT NULL,
            cpf VARCHAR(14) DEFAULT NULL,
            instagram_link VARCHAR(255) DEFAULT NULL
        )
    """)
    # Adicionar constraints UNIQUE para rg e cpf na tabela artists se não existirem
    _add_unique_constraint_if_not_exists(cursor, db_name, 'artists', 'rg', 'uq_artists_rg')
    _add_unique_constraint_if_not_exists(cursor, db_name, 'artists', 'cpf', 'uq_artists_cpf')


    cursor.execute("DROP TABLE IF EXISTS posts_temp_migration")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            actor_id INT NOT NULL,
            actor_type VARCHAR(10) NOT NULL,
            content TEXT NOT NULL,
            media_path VARCHAR(255) DEFAULT NULL,
            media_type VARCHAR(10) DEFAULT NULL,
            post_type VARCHAR(20) DEFAULT 'publication',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            actor_id INT NOT NULL,
            actor_type VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            UNIQUE KEY unique_post_actor_like (post_id, actor_id, actor_type)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            actor_id INT NOT NULL,
            actor_type VARCHAR(10) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
    """)

    db.commit()
    cursor.close()

@click.command('init-db')
@with_appcontext
def init_db_command_cli():
    _init_db_tables()
    click.echo(f"Database '{current_app.config['DB_NAME']}' initialized with new table structure.")

def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command_cli)

    with app.app_context():
        try:
            get_db()
            _init_db_tables()
            current_app.logger.info(f"Database {current_app.config['DB_NAME']} checked/initialized on app startup with new table structure.")
        except Exception as e:
            current_app.logger.error(f"Failed to initialize database on startup with new table structure: {e}")
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

def _init_db_tables():
    db = get_db()
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

    if not _check_column_exists(cursor, db_name, 'users', 'avatar_position'):
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_position VARCHAR(50) DEFAULT '50% 50%'")
    if not _check_column_exists(cursor, db_name, 'users', 'avatar_size'):
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_size VARCHAR(20) DEFAULT 'cover'")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            image_path VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_post_like (user_id, post_id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
    """)


    db.commit()
    cursor.close()

@click.command('init-db')
@with_appcontext
def init_db_command_cli():
    _init_db_tables()
    click.echo(f"Database '{current_app.config['DB_NAME']}' initialized with tables.")

def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command_cli)

    with app.app_context():
        try:
            db = get_db()
            _init_db_tables()
            current_app.logger.info(f"Database {current_app.config['DB_NAME']} checked/initialized on app startup.")
        except Exception as e:
            current_app.logger.error(f"Failed to initialize database on startup: {e}")

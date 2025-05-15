import os
import secrets
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_USER = os.environ.get("DB_USER")
    DB_PASSWORD = os.environ.get("DB_PASSWORD")
    DB_NAME = os.environ.get("DB_NAME", "corsona")

    if not SECRET_KEY:
        print("AVISO: SECRET_KEY não definida no .env. Usando uma chave padrão temporária (NÃO USE EM PRODUÇÃO).")
        SECRET_KEY = secrets.token_hex(32)

    missing_db_vars = []
    if not DB_USER:
        missing_db_vars.append("DB_USER")
    if not DB_PASSWORD:
        missing_db_vars.append("DB_PASSWORD")

    if missing_db_vars:
        raise ValueError(f"As seguintes variáveis de banco de dados devem ser definidas no arquivo .env: {', '.join(missing_db_vars)}")

    APP_ROOT = os.path.abspath(os.path.dirname(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(APP_ROOT, ".."))

    UPLOAD_FOLDER_NAME = 'uploads'
    UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, UPLOAD_FOLDER_NAME)
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'ogg', 'mp3', 'wav'}

    SESSION_TYPE = "filesystem"
    SESSION_PERMANENT = True
    SESSION_USE_SIGNER = True
    SESSION_FILE_DIR = os.path.join(PROJECT_ROOT, "flask_session")
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    
    SESSION_COOKIE_SECURE = True if os.environ.get('FLASK_ENV') == 'production' else False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
from functools import wraps
from flask import session, redirect, url_for, request, jsonify, current_app
import bcrypt
import os
import secrets
from werkzeug.utils import secure_filename
from .db import get_db
import mysql.connector

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.accept_mimetypes.accept_json and \
               not request.accept_mimetypes.accept_html:
                return jsonify(message="Autenticação requerida"), 401
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def db_handler(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        db = None
        cursor = None
        try:
            db = get_db()
            cursor = db.cursor(dictionary=True)
            result = f(cursor, *args, **kwargs)
            db.commit()
            return result
        except mysql.connector.Error as err:
            if db:
                db.rollback()
            current_app.logger.error(f"Database error: {err}")
            return jsonify({"message": f"Erro no banco de dados: {str(err)}"}), 500
        except Exception as e:
            if db:
                db.rollback()
            current_app.logger.error(f"Internal server error: {e}")
            return jsonify({"message": f"Erro interno no servidor: {str(e)}"}), 500
        finally:
            if cursor:
                cursor.close()
    return decorated_function

def serialize_user(user_db_row):
    if not user_db_row:
        return None
    return {
        "id": user_db_row.get("id"),
        "name": user_db_row.get("name"),
        "email": user_db_row.get("email"),
        "username": user_db_row.get("username"),
        "bio": user_db_row.get("bio"),
        "avatar_path": user_db_row.get("avatar_path"),
        "avatar_position": user_db_row.get("avatar_position"),
        "avatar_size": user_db_row.get("avatar_size"),
    }

def update_session_with_user_data(user_dict):
    session.clear()
    if user_dict:
        session["user_id"] = user_dict["id"]
        session["user_name"] = user_dict["name"]
        session["user_email"] = user_dict["email"]
        session["user_username"] = user_dict["username"]
        session["user_avatar_path"] = user_dict.get("avatar_path")
        session["user_avatar_position"] = user_dict.get("avatar_position", '50% 50%')
        session["user_avatar_size"] = user_dict.get("avatar_size", 'cover')
        session.modified = True

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def save_avatar(avatar_file, old_avatar_path=None):
    if avatar_file and allowed_file(avatar_file.filename):
        filename = secure_filename(avatar_file.filename)
        unique_filename = f"{secrets.token_hex(8)}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        avatar_file.save(file_path)
        new_avatar_path = f'/{current_app.config["UPLOAD_FOLDER_NAME"]}/{unique_filename}'

        if old_avatar_path and old_avatar_path.startswith(f'/{current_app.config["UPLOAD_FOLDER_NAME"]}/'):
            old_filename_in_uploads = old_avatar_path.split('/')[-1]
            old_avatar_full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], old_filename_in_uploads)
            if os.path.exists(old_avatar_full_path):
                try:
                    os.remove(old_avatar_full_path)
                except Exception as e:
                    current_app.logger.error(f"Erro ao remover avatar antigo {old_avatar_full_path}: {e}")
        return new_avatar_path
    return None

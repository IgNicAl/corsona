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
        if 'user_id' not in session or 'actor_type' not in session:
            if request.accept_mimetypes.accept_json and \
               not request.accept_mimetypes.accept_html:
                return jsonify(message="Autenticação requerida"), 401
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def db_handler(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        db_conn = None
        cursor = None
        try:
            db_conn = get_db()
            cursor = db_conn.cursor(dictionary=True)
            result = f(cursor, *args, **kwargs)
            db_conn.commit()
            return result
        except mysql.connector.Error as err:
            if db_conn:
                db_conn.rollback()
            current_app.logger.error(f"Database error: {err}")
            return jsonify({"message": "Erro no banco de dados. Tente novamente mais tarde."}), 500
        except Exception as e:
            if db_conn:
                db_conn.rollback()
            current_app.logger.error(f"Internal server error: {e}")
            return jsonify({"message": "Erro interno no servidor. Tente novamente mais tarde."}), 500
        finally:
            if cursor:
                cursor.close()
    return decorated_function

def serialize_user(user_db_row, actor_type):
    if not user_db_row:
        return None
    
    user_data = {
        "id": user_db_row.get("id"),
        "name": user_db_row.get("name"),
        "email": user_db_row.get("email"),
        "username": user_db_row.get("username"),
        "bio": user_db_row.get("bio"),
        "avatar_path": user_db_row.get("avatar_path"),
        "avatar_position": user_db_row.get("avatar_position"),
        "avatar_size": user_db_row.get("avatar_size"),
        "actor_type": actor_type
    }

    if actor_type == "artist":
        user_data["rg"] = user_db_row.get("rg")
        user_data["cpf"] = user_db_row.get("cpf")
        user_data["instagram_link"] = user_db_row.get("instagram_link")
            
    return user_data

def update_session_with_user_data(user_dict, actor_type):
    session.clear()
    if user_dict and actor_type:
        session["user_id"] = user_dict["id"]
        session["actor_id"] = user_dict["id"]
        session["actor_type"] = actor_type
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

def get_media_type(filename):
    extension = filename.rsplit('.', 1)[1].lower()
    if extension in ['png', 'jpg', 'jpeg', 'gif']:
        return 'image'
    elif extension in ['mp4', 'webm', 'ogg']:
        return 'video'
    elif extension in ['mp3', 'wav']:
        return 'audio'
    return None

def save_media_file(media_file, old_media_path=None):
    if media_file and allowed_file(media_file.filename):
        filename = secure_filename(media_file.filename)
        unique_filename = f"{secrets.token_hex(8)}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        media_file.save(file_path)
        new_media_path = f'/{current_app.config["UPLOAD_FOLDER_NAME"]}/{unique_filename}'

        if old_media_path and old_media_path.startswith(f'/{current_app.config["UPLOAD_FOLDER_NAME"]}/'):
            old_filename_in_uploads = old_media_path.split('/')[-1]
            old_media_full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], old_filename_in_uploads)
            if os.path.exists(old_media_full_path):
                try:
                    os.remove(old_media_full_path)
                except Exception as e:
                    current_app.logger.error(f"Erro ao remover mídia antiga {old_media_full_path}: {e}")
        return new_media_path
    return None

def save_avatar(avatar_file, old_avatar_path=None):
    return save_media_file(avatar_file, old_avatar_path)

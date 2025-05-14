from flask import request, jsonify, send_from_directory, session, redirect, url_for
import bcrypt
import mysql.connector
import os
import secrets
import time
from werkzeug.utils import secure_filename

from . import app
from .db import get_db_connection, DB_NAME

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
UPLOAD_FOLDER_NAME = 'uploads'
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, UPLOAD_FOLDER_NAME)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_project_static_dir(subdir_name):
    return os.path.join(app.config["PROJECT_ROOT"], subdir_name)

@app.route("/debug/session")
def debug_session():
    if "user_id" in session:
        return jsonify(
            {
                "status": "Autenticado",
                "session_data": {
                    "user_id": session["user_id"],
                    "user_name": session.get("user_name", "Não definido"),
                    "user_email": session.get("user_email", "Não definido"),
                    "user_username": session.get("user_username", "Não definido"),
                    "user_avatar_path": session.get("user_avatar_path", "Não definido"),
                     "user_avatar_position": session.get("user_avatar_position", "Não definido"),
                     "user_avatar_size": session.get("user_avatar_size", "Não definido"),
                },
            }
        )
    else:
        return jsonify({"status": "Não autenticado", "session_data": dict(session)})

@app.route("/")
@app.route("/Login")
def serve_login_page():
    if 'user_id' in session:
         return redirect(url_for('serve_feed_page'))
    return send_from_directory(get_project_static_dir("Login"), "Login.html")

@app.route("/Feed")
def serve_feed_page():
     if 'user_id' not in session:
         return redirect(url_for('serve_login_page'))
     return send_from_directory(get_project_static_dir("Feed"), "Feed.html")

@app.route("/Login/login.js")
def serve_login_js():
    return send_from_directory(get_project_static_dir("Login"), "login.js")

@app.route("/Register")
def serve_register_page():
    return send_from_directory(get_project_static_dir("Register"), "Register.html")

@app.route("/Feed/styles.css")
def serve_feed_styles():
    return send_from_directory(get_project_static_dir("Feed"), "styles.css")

@app.route("/Feed/feed.js")
def serve_feed_js():
    return send_from_directory(get_project_static_dir("Feed"), "feed.js")

@app.route("/Register/register.js")
def serve_register_js():
    return send_from_directory(get_project_static_dir("Register"), "register.js")

@app.route("/Login/styles.css")
def serve_login_styles():
    return send_from_directory(get_project_static_dir("Login"), "styles.css")

@app.route("/Register/styles.css")
def serve_register_styles():
    return send_from_directory(get_project_static_dir("Register"), "styles.css")

@app.route("/global.css")
def serve_global_css():
    return send_from_directory(app.config["PROJECT_ROOT"], "global.css")

@app.route("/Logos/<path:filename>")
def serve_logos(filename):
    return send_from_directory(get_project_static_dir("Logos"), filename)

@app.route(f'/{UPLOAD_FOLDER_NAME}/<path:filename>')
def serve_uploaded_file(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        return "File not found", 404

@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.get_json()
    if not data or not all(
        k in data for k in ("name", "username", "email", "password")
    ):
        return jsonify({"message": "Dados incompletos"}), 400
    name = data["name"]
    username = data["username"]
    email = data["email"]
    password = data["password"]
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn:
            return jsonify({"message": "Erro de conexão com o banco de dados"}), 500
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "E-mail já cadastrado"}), 409
        cursor.execute("SELECT username FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            return jsonify({"message": "Nome de usuário já cadastrado"}), 409
        sql = "INSERT INTO users (name, username, email, password, avatar_position, avatar_size) VALUES (%s, %s, %s, %s, %s, %s)"
        val = (name, username, email, hashed_password.decode("utf-8"), '50% 50%', 'cover')
        cursor.execute(sql, val)
        conn.commit()
        return jsonify({"message": "Cadastro realizado com sucesso!"}), 201
    except mysql.connector.Error as err:
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        return jsonify({"message": "Erro interno no servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json()
    if not data or not all(k in data for k in ("identifier", "password")):
        return jsonify(
            {"message": "Dados incompletos: identificador e senha são obrigatórios"}
        ), 400

    identifier = data["identifier"]
    password_attempt = data["password"]

    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn:
            return jsonify({"message": "Erro de conexão com o banco de dados"}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, name, username, email, password, bio, avatar_path, avatar_position, avatar_size FROM users WHERE email = %s OR username = %s",
            (identifier, identifier),
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "Usuário ou senha inválidos"}), 401

        password_match = bcrypt.checkpw(
            password_attempt.encode("utf-8"), user["password"].encode("utf-8")
        )
        if password_match:
            session.clear()
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["user_email"] = user["email"]
            session["user_username"] = user["username"]
            if user.get("avatar_path"):
                 session["user_avatar_path"] = user["avatar_path"]
            else:
                 session.pop("user_avatar_path", None)

            session["user_avatar_position"] = user.get("avatar_position", '50% 50%')
            session["user_avatar_size"] = user.get("avatar_size", 'cover')

            session.modified = True
            user_data = {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "username": user["username"],
                 "bio": user["bio"],
                 "avatar_path": user.get("avatar_path"),
                 "avatar_position": user.get("avatar_position"),
                 "avatar_size": user.get("avatar_size"),
            }
            return jsonify({"message": "Login bem-sucedido!", "user": user_data}), 200
        else:
            return jsonify({"message": "Usuário ou senha inválidos"}), 401
    except mysql.connector.Error as err:
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        return jsonify({"message": "Erro interno no servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/user", methods=["GET"])
def get_user():
    if "user_id" in session:
        user_id = session["user_id"]

        conn = None
        cursor = None
        try:
            conn = get_db_connection(database_name=DB_NAME)
            if not conn:
                return jsonify({"message": "Erro de conexão com o banco de dados"}), 500

            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, name, username, email, bio, avatar_path, avatar_position, avatar_size FROM users WHERE id = %s",
                (user_id,),
            )
            user = cursor.fetchone()

            if user:
                user_data = {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "username": user["username"],
                    "bio": user["bio"],
                     "avatar_path": user.get("avatar_path"),
                     "avatar_position": user.get("avatar_position"),
                     "avatar_size": user.get("avatar_size"),
                }
                return jsonify({"user": user_data}), 200
            else:
                session.clear()
                return jsonify({"message": "Usuário não encontrado"}), 404
        except mysql.connector.Error as err:
            # Incluindo detalhes do erro para depuração
            print(f"Database error in get_user: {err}")
            return jsonify({"message": f"Erro no banco de dados ao buscar usuário: {err}"}), 500
        except Exception as e:
            # Incluindo detalhes do erro para depuração
            print(f"Unexpected error in get_user: {e}")
            return jsonify({"message": "Erro interno no servidor ao buscar usuário"}), 500
        finally:
            if cursor:
                cursor.close()
            if conn and conn.is_connected():
                conn.close()
    else:
        return jsonify({"message": "Usuário não está logado"}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logout realizado com sucesso"}), 200

@app.route("/api/user/profile", methods=["POST"])
def update_user_profile():
    if "user_id" not in session:
        return jsonify({"message": "Usuário não está logado"}), 401

    name = request.form.get("name", "").strip()
    username = request.form.get("username", "").strip()
    bio = request.form.get("bio", "").strip()
    avatar_file = request.files.get("avatar")

    avatar_position = request.form.get("avatar_position")
    avatar_size = request.form.get("avatar_size")


    if not name:
        return jsonify({"message": "Nome não pode estar vazio"}), 400

    if not username:
        return jsonify({"message": "Nome de usuário não pode estar vazio"}), 400

    if len(bio) > 150:
        return jsonify({"message": "A bio deve ter no máximo 150 caracteres"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn:
            return jsonify({"message": "Erro de conexão com o banco de dados"}), 500

        cursor = conn.cursor(dictionary=True)

        if username != session["user_username"]:
            cursor.execute(
                "SELECT id FROM users WHERE username = %s AND id != %s",
                (username, session["user_id"]),
            )
            if cursor.fetchone():
                return jsonify(
                    {"message": "Nome de usuário já está em uso por outro usuário"}
                ), 409

        new_avatar_path = None
        if avatar_file and allowed_file(avatar_file.filename):
            filename = secure_filename(avatar_file.filename)
            unique_filename = f"{secrets.token_hex(8)}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)

            avatar_file.save(file_path)

            new_avatar_path = f'/{UPLOAD_FOLDER_NAME}/{unique_filename}'

            cursor.execute("SELECT avatar_path FROM users WHERE id = %s", (session["user_id"],))
            old_avatar_path_row = cursor.fetchone()
            if old_avatar_path_row and old_avatar_path_row.get("avatar_path"):
                old_avatar_relative_path = old_avatar_path_row["avatar_path"]
                if old_avatar_relative_path and old_avatar_relative_path.startswith(f'/{UPLOAD_FOLDER_NAME}/'): # Adicionado check para old_avatar_relative_path não ser None/vazio
                    old_filename_in_uploads = old_avatar_relative_path.replace(f'/{UPLOAD_FOLDER_NAME}/', '', 1)
                    old_avatar_full_path = os.path.join(app.config['UPLOAD_FOLDER'], old_filename_in_uploads)
                    if os.path.exists(old_avatar_full_path):
                         try:
                             os.remove(old_avatar_full_path)
                         except Exception as e:
                             print(f"Erro ao remover avatar antigo {old_avatar_full_path}: {e}")

        sql_parts = ["UPDATE users SET name = %s, username = %s, bio = %s"]
        params = [name, username, bio]

        if new_avatar_path:
            sql_parts.append("avatar_path = %s")
            params.append(new_avatar_path)

        if avatar_position is not None:
             sql_parts.append("avatar_position = %s")
             params.append(avatar_position)

        if avatar_size is not None:
             sql_parts.append("avatar_size = %s")
             params.append(avatar_size)

        sql = ", ".join(sql_parts) + " WHERE id = %s"
        params.append(session["user_id"])

        cursor.execute(sql, params)
        conn.commit()

        cursor.execute(
            "SELECT id, name, username, email, bio, avatar_path, avatar_position, avatar_size FROM users WHERE id = %s",
            (session["user_id"],),
        )
        updated_user = cursor.fetchone()

        session["user_name"] = updated_user["name"]
        session["user_username"] = updated_user["username"]
        session["user_bio"] = updated_user["bio"]
        if updated_user.get("avatar_path"):
             session["user_avatar_path"] = updated_user["avatar_path"]
        else:
             session.pop("user_avatar_path", None)

        session["user_avatar_position"] = updated_user.get("avatar_position", '50% 50%')
        session["user_avatar_size"] = updated_user.get("avatar_size", 'cover')

        user_data = {
            "id": updated_user["id"],
            "name": updated_user["name"],
            "email": updated_user["email"], # CORRIGIDO: updated_user["email"]
            "username": updated_user["username"],
            "bio": updated_user["bio"],
             "avatar_path": updated_user.get("avatar_path"),
             "avatar_position": updated_user.get("avatar_position"),
             "avatar_size": updated_user.get("avatar_size"),
        }

        return jsonify(
            {"message": "Perfil atualizado com sucesso", "user": user_data}
        ), 200

    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Database error in update_user_profile: {err}") # Adicionado print
        return jsonify({"message": f"Erro no banco de dados ao atualizar perfil: {err}"}), 500 # Mensagem mais clara
    except Exception as e:
        conn.rollback()
        print(f"Unexpected error in update_user_profile: {e}") # Adicionado print
        return jsonify({"message": "Erro interno no servidor ao atualizar perfil"}), 500 # Mensagem mais clara
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/user/password", methods=["POST"])
def change_password():
    if "user_id" not in session:
        return jsonify({"message": "Usuário não está logado"}), 401

    data = request.get_json()
    if not data or not all(k in data for k in ("currentPassword", "newPassword")):
        return jsonify(
            {"message": "Dados incompletos: senha atual e nova senha são obrigatórios"}
        ), 400

    current_password = data["currentPassword"]
    new_password = data["newPassword"]

    if len(new_password) < 6:
        return jsonify(
            {"message": "A nova senha deve ter pelo menos 6 caracteres"}
        ), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn:
            return jsonify({"message": "Erro de conexão com o banco de dados"}), 500

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT password FROM users WHERE id = %s", (session["user_id"],)
        )
        user = cursor.fetchone()

        if not user or not bcrypt.checkpw(
            current_password.encode("utf-8"), user["password"].encode("utf-8")
        ):
            return jsonify({"message": "Senha atual incorreta"}), 401

        hashed_password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())

        cursor.execute(
            "UPDATE users SET password = %s WHERE id = %s",
            (hashed_password.decode("utf-8"), session["user_id"]),
        )
        conn.commit()

        return jsonify({"message": "Senha alterada com sucesso"}), 200
    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        conn.rollback()
        return jsonify({"message": "Erro interno no servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/Profile")
def serve_profile_page():
     if 'user_id' not in session:
         return redirect(url_for('serve_login_page'))
     return redirect(url_for('serve_feed_page'))

@app.route("/Profile/styles.css")
def serve_profile_styles_redirect():
    return redirect(url_for('serve_profile_modal_styles'))

@app.route("/Profile/profile.js")
def serve_profile_js_redirect():
     return redirect(url_for('serve_profile_modal_js'))

@app.route("/Profile/profile-styles.css")
def serve_profile_modal_styles():
     if 'user_id' not in session:
         pass
     return send_from_directory(get_project_static_dir("Profile"), "profile-styles.css")

@app.route("/Profile/profile-modal.js")
def serve_profile_modal_js():
     if 'user_id' not in session:
         pass
     return send_from_directory(get_project_static_dir("Profile"), "profile-modal.js")
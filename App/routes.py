from flask import request, jsonify, send_from_directory, session, redirect
import bcrypt
import mysql.connector
import os
import secrets
import time

from . import app
from .db import get_db_connection, DB_NAME


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
                },
            }
        )
    else:
        return jsonify({"status": "Não autenticado", "session_data": dict(session)})


def get_project_static_dir(subdir_name):
    return os.path.join(app.config["PROJECT_ROOT"], subdir_name)


@app.route("/")
@app.route("/Login")
def serve_login_page():
    return send_from_directory(get_project_static_dir("Login"), "Login.html")


@app.route("/Login/login.js")
def serve_login_js():
    return send_from_directory(get_project_static_dir("Login"), "login.js")


@app.route("/Register")
def serve_register_page():
    return send_from_directory(get_project_static_dir("Register"), "Register.html")


@app.route("/Feed")
def serve_feed_page():
    return send_from_directory(get_project_static_dir("Feed"), "Feed.html")


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
        sql = "INSERT INTO users (name, username, email, password) VALUES (%s, %s, %s, %s)"
        val = (name, username, email, hashed_password.decode("utf-8"))
        cursor.execute(sql, val)
        conn.commit()
        return jsonify({"message": "Cadastro realizado com sucesso!"}), 201
    except mysql.connector.Error as err:
        print(f"Database error during registration: {err}")
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        print(f"Unexpected error during registration: {e}")
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
    print(f"Tentativa de login para identificador: {identifier}")

    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn:
            print("Erro de conexão com o banco de dados durante login")
            return jsonify({"message": "Erro de conexão com o banco de dados"}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM users WHERE email = %s OR username = %s",
            (identifier, identifier),
        )
        user = cursor.fetchone()

        if not user:
            print(f"Usuário não encontrado para identificador: {identifier}")
            return jsonify({"message": "Usuário ou senha inválidos"}), 401

        password_match = bcrypt.checkpw(
            password_attempt.encode("utf-8"), user["password"].encode("utf-8")
        )
        print(
            f"Verificação de senha para {identifier}: {'Sucesso' if password_match else 'Falha'}"
        )
        if password_match:
            session.clear()
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["user_email"] = user["email"]
            session["user_username"] = user["username"]
            print(
                f"Login bem-sucedido para {identifier}, user_id: {user['id']}, sessão configurada"
            )
            print(f"Dados da sessão: {dict(session)}")
            session.modified = True
            user_data = {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "username": user["username"],
            }
            return jsonify({"message": "Login bem-sucedido!", "user": user_data}), 200
        else:
            return jsonify({"message": "Usuário ou senha inválidos"}), 401
    except mysql.connector.Error as err:
        print(f"Database error during login: {err}")
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        print(f"Unexpected error during login: {e}")
        return jsonify({"message": "Erro interno no servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.route("/api/user", methods=["GET"])
def get_user():
    print(f"Requisição para /api/user. Dados da sessão: {dict(session)}")

    if "user_id" in session:
        user_id = session["user_id"]
        print(f"Usuário autenticado encontrado: ID {user_id}")

        conn = None
        cursor = None
        try:
            conn = get_db_connection(database_name=DB_NAME)
            if not conn:
                print(
                    f"Erro de conexão com o banco na rota /api/user para usuário {user_id}"
                )
                return jsonify({"message": "Erro de conexão com o banco de dados"}), 500

            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, name, username, email, bio FROM users WHERE id = %s",
                (user_id,),
            )
            user = cursor.fetchone()

            if user:
                print(f"Usuário {user_id} encontrado no banco de dados.")
                user_data = {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "username": user["username"],
                    "bio": user["bio"],
                }

                return jsonify({"user": user_data}), 200
            else:
                print(
                    f"Usuário {user_id} não encontrado no banco de dados apesar de estar na sessão."
                )
                session.clear()
                return jsonify({"message": "Usuário não encontrado"}), 404
        except mysql.connector.Error as err:
            print(f"Database error when fetching user: {err}")
            return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
        except Exception as e:
            print(f"Unexpected error when fetching user: {e}")
            return jsonify({"message": "Erro interno no servidor"}), 500
        finally:
            if cursor:
                cursor.close()
            if conn and conn.is_connected():
                conn.close()
    else:
        print("Requisição para /api/user sem autenticação (não há user_id na sessão)")
        return jsonify({"message": "Usuário não está logado"}), 401


@app.route("/api/user/bio", methods=["POST"])
def update_user_bio():
    if "user_id" not in session:
        return jsonify({"message": "Usuário não está logado"}), 401

    data = request.get_json()
    if not data or "bio" not in data:
        return jsonify({"message": "Bio não fornecida"}), 400

    bio = data["bio"]
    if len(bio) > 150:
        return jsonify({"message": "A bio deve ter no máximo 150 caracteres"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn:
            return jsonify({"message": "Erro de conexão com o banco de dados"}), 500

        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET bio = %s WHERE id = %s", (bio, session["user_id"])
        )
        conn.commit()

        if cursor.rowcount > 0:
            return jsonify({"message": "Bio atualizada com sucesso"}), 200
        else:
            return jsonify({"message": "Nenhuma alteração foi feita"}), 200
    except mysql.connector.Error as err:
        print(f"Database error when updating bio: {err}")
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        print(f"Unexpected error when updating bio: {e}")
        return jsonify({"message": "Erro interno no servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logout realizado com sucesso"}), 200


@app.route("/api/user/profile", methods=["POST"])
def update_user_profile():
    if "user_id" not in session:
        return jsonify({"message": "Usuário não está logado"}), 401

    if not request.form:
        return jsonify({"message": "Dados não fornecidos"}), 400

    name = request.form.get("name", "").strip()
    username = request.form.get("username", "").strip()
    bio = request.form.get("bio", "").strip()

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

        sql = "UPDATE users SET name = %s, username = %s, bio = %s WHERE id = %s"
        params = [name, username, bio, session["user_id"]]

        cursor.execute(sql, params)
        conn.commit()

        session["user_name"] = name
        session["user_username"] = username

        cursor.execute(
            "SELECT id, name, username, email, bio FROM users WHERE id = %s",
            (session["user_id"],),
        )
        updated_user = cursor.fetchone()

        user_data = {
            "id": updated_user["id"],
            "name": updated_user["name"],
            "email": updated_user["email"],
            "username": updated_user["username"],
            "bio": updated_user["bio"],
        }

        return jsonify(
            {"message": "Perfil atualizado com sucesso", "user": user_data}
        ), 200
    except mysql.connector.Error as err:
        print(f"Database error when updating profile: {err}")
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        print(f"Unexpected error when updating profile: {e}")
        return jsonify({"message": "Erro interno no servidor"}), 500
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
        print(f"Database error when changing password: {err}")
        return jsonify({"message": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        print(f"Unexpected error when changing password: {e}")
        return jsonify({"message": "Erro interno no servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.route("/Profile")
def serve_profile_page():
    return redirect("/Feed")


@app.route("/Profile/styles.css")
def serve_profile_styles():
    return redirect("/Feed")


@app.route("/Profile/profile.js")
def serve_profile_js():
    return redirect("/Feed")


@app.route("/Profile/profile-styles.css")
def serve_profile_modal_styles():
    return send_from_directory(get_project_static_dir("Profile"), "profile-styles.css")


@app.route("/Profile/profile-modal.js")
def serve_profile_modal_js():
    return send_from_directory(get_project_static_dir("Profile"), "profile-modal.js")

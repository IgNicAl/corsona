from flask import request, jsonify, session, redirect, url_for, render_template
import bcrypt
import re
from . import auth_bp
from ..utils import db_handler, serialize_user, update_session_with_user_data, login_required

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        return _register_user_api()
    return render_template("auth/register.html")

@db_handler
def _register_user_api(cursor):
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "username", "email", "password")):
        return jsonify({"message": "Dados de cadastro incompletos."}), 400

    name = data["name"].strip()
    username = data["username"].strip()
    email = data["email"].strip()
    password = data["password"]

    if not re.fullmatch(r"^[A-Za-zÀ-ú\s]+$", name):
        return jsonify({"message": "O nome deve conter apenas letras e espaços."}), 400
    if not re.fullmatch(r"^\S+$", username):
        return jsonify({"message": "O nome de usuário não pode conter espaços."}), 400
    if not re.fullmatch(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return jsonify({"message": "Formato de e-mail inválido."}), 400
    if len(password) < 6:
        return jsonify({"message": "A senha deve ter pelo menos 6 caracteres."}), 400

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
    if cursor.fetchone():
        return jsonify({"message": "Este e-mail já está cadastrado."}), 409
    cursor.execute("SELECT username FROM users WHERE username = %s", (username,))
    if cursor.fetchone():
        return jsonify({"message": "Este nome de usuário já está em uso."}), 409

    sql = "INSERT INTO users (name, username, email, password, avatar_position, avatar_size) VALUES (%s, %s, %s, %s, %s, %s)"
    val = (name, username, email, hashed_password.decode("utf-8"), '50% 50%', 'cover')
    cursor.execute(sql, val)
    return jsonify({"message": "Cadastro realizado com sucesso! Você já pode fazer o login."}), 201


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if 'user_id' in session:
        return redirect(url_for('feed.feed_page'))
    if request.method == "POST":
        return _login_user_api()
    return render_template("auth/login.html")

@db_handler
def _login_user_api(cursor):
    data = request.get_json()
    if not data or not all(k in data for k in ("identifier", "password")):
        return jsonify({"message": "Identificador e senha são obrigatórios."}), 400

    identifier = data["identifier"]
    password_attempt = data["password"]

    cursor.execute(
        "SELECT id, name, username, email, password, bio, avatar_path, avatar_position, avatar_size FROM users WHERE email = %s OR username = %s",
        (identifier, identifier),
    )
    user_db_row = cursor.fetchone()

    if not user_db_row or not bcrypt.checkpw(password_attempt.encode("utf-8"), user_db_row["password"].encode("utf-8")):
        return jsonify({"message": "Usuário ou senha inválidos."}), 401

    user_data_for_session = serialize_user(user_db_row)
    update_session_with_user_data(user_data_for_session)
    return jsonify({"message": "Login bem-sucedido!", "user": user_data_for_session}), 200

@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    update_session_with_user_data(None) 
    return jsonify({"message": "Logout realizado com sucesso"}), 200

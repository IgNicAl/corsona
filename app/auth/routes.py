from flask import request, jsonify, session, redirect, url_for, render_template, current_app
import bcrypt
import re
from . import auth_bp
from ..utils import db_handler, serialize_user, update_session_with_user_data, login_required

def is_valid_cpf(cpf: str) -> bool:
    if not cpf:
        return True
    cpf_digits = re.sub(r'[^0-9]', '', cpf)
    if len(cpf_digits) != 11 or len(set(cpf_digits)) == 1:
        return False
    soma = sum(int(cpf_digits[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    if resto == 10: resto = 0
    if resto != int(cpf_digits[9]):
        return False
    soma = sum(int(cpf_digits[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    if resto == 10: resto = 0
    return resto == int(cpf_digits[10])

def is_valid_instagram_url(url: str) -> bool:
    if not url:
        return True
    pattern = r"^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9(\.\?)?_]+(\/)?$"
    return re.match(pattern, url) is not None

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        return _register_user_api()
    return render_template("auth/register.html")

@db_handler
def _register_user_api(cursor):
    data = request.get_json()
    if not data:
        return jsonify({"message": "Dados de cadastro não fornecidos."}), 400

    required_fields = ["name", "username", "email", "password", "user_type"]
    if not all(k in data for k in required_fields):
        return jsonify({"message": "Dados de cadastro incompletos. Verifique os campos obrigatórios."}), 400

    name = data["name"].strip()
    username = data["username"].strip()
    email = data["email"].strip()
    password = data["password"]
    actor_type_from_form = data["user_type"].strip().lower()

    rg_data = data.get("rg", "").strip() if data.get("rg") else None
    cpf_data = data.get("cpf", "").strip() if data.get("cpf") else None
    instagram_link_data = data.get("instagram_link", "").strip() if data.get("instagram_link") else None

    if not re.fullmatch(r"^[A-Za-zÀ-ú\s]+$", name):
        return jsonify({"message": "O nome deve conter apenas letras e espaços."}), 400
    if not re.fullmatch(r"^\S+$", username):
        return jsonify({"message": "O nome de usuário não pode conter espaços."}), 400
    if not re.fullmatch(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return jsonify({"message": "Formato de e-mail inválido."}), 400
    if len(password) < 8:
        return jsonify({"message": "A senha deve ter pelo menos 8 caracteres."}), 400
    if actor_type_from_form not in ["user", "artist"]:
        return jsonify({"message": "Tipo de usuário inválido."}), 400

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    cursor.execute("SELECT email FROM users WHERE email = %s UNION SELECT email FROM artists WHERE email = %s", (email, email))
    if cursor.fetchone():
        return jsonify({"message": "Este e-mail já está cadastrado no sistema."}), 409

    cursor.execute("SELECT username FROM users WHERE username = %s UNION SELECT username FROM artists WHERE username = %s", (username, username))
    if cursor.fetchone():
        return jsonify({"message": "Este nome de usuário já está em uso no sistema."}), 409

    try:
        if actor_type_from_form == "user":
            sql = """
                INSERT INTO users (name, username, email, password, bio, avatar_path, avatar_position, avatar_size)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            val = (name, username, email, hashed_password.decode("utf-8"), None, None, '50% 50%', 'cover')
            cursor.execute(sql, val)
        elif actor_type_from_form == "artist":
            if not rg_data:
                return jsonify({"message": "RG é obrigatório para artistas."}), 400
            if not cpf_data:
                return jsonify({"message": "CPF é obrigatório para artistas."}), 400
            if not is_valid_cpf(cpf_data):
                return jsonify({"message": "CPF inválido. Verifique o formato e os dígitos."}), 400
            if not instagram_link_data:
                return jsonify({"message": "Link do Instagram é obrigatório para artistas."}), 400
            if not is_valid_instagram_url(instagram_link_data):
                return jsonify({"message": "Link do Instagram inválido."}), 400

            cursor.execute("SELECT id FROM artists WHERE rg = %s", (rg_data,))
            if cursor.fetchone():
                return jsonify({"message": "Este RG de artista já está cadastrado."}), 409

            normalized_cpf_to_check = re.sub(r'[^0-9]', '', cpf_data)
            cursor.execute("SELECT id FROM artists WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = %s AND cpf IS NOT NULL", (normalized_cpf_to_check,))
            if cursor.fetchone():
                return jsonify({"message": "Este CPF de artista já está cadastrado."}), 409


            sql = """
                INSERT INTO artists (name, username, email, password, bio, avatar_path, avatar_position, avatar_size, rg, cpf, instagram_link)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            val = (name, username, email, hashed_password.decode("utf-8"), None, None, '50% 50%', 'cover', rg_data, cpf_data, instagram_link_data)
            cursor.execute(sql, val)

        return jsonify({"message": "Cadastro realizado com sucesso! Você já pode fazer o login."}), 201

    except mysql.connector.Error as err_db:
        if err_db.errno == 1062: # Duplicate entry
            err_msg_lower = str(err_db).lower()
            if "uq_artists_cpf" in err_msg_lower or "cpf" in err_msg_lower: # Verificar pela constraint ou nome da coluna
                 return jsonify({"message": "Este CPF de artista já está cadastrado (DB)."}), 409
            if "uq_artists_rg" in err_msg_lower or "rg" in err_msg_lower:  # Verificar pela constraint ou nome da coluna
                 return jsonify({"message": "Este RG de artista já está cadastrado (DB)."}), 409
            if "username" in err_msg_lower:
                 return jsonify({"message": "Este nome de usuário já está em uso (DB)."}), 409
            if "email" in err_msg_lower:
                 return jsonify({"message": "Este e-mail já está cadastrado (DB)."}), 409
        current_app.logger.error(f"Erro de banco de dados ao registrar usuário: {err_db}")
        return jsonify({"message": f"Erro interno ao realizar o cadastro: {str(err_db)}"}), 500
    except Exception as e:
        current_app.logger.error(f"Erro geral ao registrar usuário: {e}")
        return jsonify({"message": f"Erro interno ao realizar o cadastro: {str(e)}"}), 500


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if 'actor_id' in session and 'actor_type' in session: # Verificando actor_id
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

    user_db_row = None
    actor_type = None

    cursor.execute(
        "SELECT id, name, username, email, password, bio, avatar_path, avatar_position, avatar_size FROM users WHERE email = %s OR username = %s",
        (identifier, identifier),
    )
    user_candidate = cursor.fetchone()
    if user_candidate and bcrypt.checkpw(password_attempt.encode("utf-8"), user_candidate["password"].encode("utf-8")):
        user_db_row = user_candidate
        actor_type = "user"

    if not user_db_row:
        cursor.execute(
            "SELECT id, name, username, email, password, bio, avatar_path, avatar_position, avatar_size, rg, cpf, instagram_link FROM artists WHERE email = %s OR username = %s",
            (identifier, identifier),
        )
        artist_candidate = cursor.fetchone()
        if artist_candidate and bcrypt.checkpw(password_attempt.encode("utf-8"), artist_candidate["password"].encode("utf-8")):
            user_db_row = artist_candidate
            actor_type = "artist"

    if not user_db_row:
        return jsonify({"message": "Usuário ou senha inválidos."}), 401

    user_data_for_session = serialize_user(user_db_row, actor_type)
    update_session_with_user_data(user_data_for_session, actor_type)

    return jsonify({ "user": user_data_for_session}), 200

@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    update_session_with_user_data(None, None)
    return jsonify({}), 200

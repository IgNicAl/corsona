from flask import request, jsonify, session, current_app
import bcrypt
from . import profile_bp
from ..utils import login_required, db_handler, serialize_user, update_session_with_user_data, save_avatar
import re

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


@profile_bp.route("/api/user/update", methods=["POST"])
@login_required
@db_handler
def update_user_profile_api(cursor):
    actor_id = session["actor_id"]
    current_actor_type = session["actor_type"]
    target_table = "artists" if current_actor_type == "artist" else "users"

    name = request.form.get("name", "").strip()
    username = request.form.get("username", "").strip()
    bio = request.form.get("bio", "").strip()
    avatar_file = request.files.get("avatar")
    avatar_position = request.form.get("avatar_position")
    avatar_size = request.form.get("avatar_size")

    if not name or not username:
        return jsonify({"message": "Nome e nome de usuário são obrigatórios."}), 400
    if len(bio) > 150:
        return jsonify({"message": "A descrição (bio) deve ter no máximo 150 caracteres."}), 400

    current_username_from_session = session.get("user_username")
    if username != current_username_from_session:
        query_check_user = "SELECT id FROM users WHERE username = %s"
        params_check_user = [username]
        if current_actor_type == "user":
            query_check_user += " AND id != %s"
            params_check_user.append(actor_id)
        cursor.execute(query_check_user, tuple(params_check_user))
        if cursor.fetchone():
            return jsonify({"message": "Este nome de usuário já está em uso por outra conta."}), 409

        query_check_artist = "SELECT id FROM artists WHERE username = %s"
        params_check_artist = [username]
        if current_actor_type == "artist":
            query_check_artist += " AND id != %s"
            params_check_artist.append(actor_id)
        cursor.execute(query_check_artist, tuple(params_check_artist))
        if cursor.fetchone():
            return jsonify({"message": "Este nome de usuário já está em uso por outra conta."}), 409

    cursor.execute(f"SELECT avatar_path FROM {target_table} WHERE id = %s", (actor_id,))
    current_actor_data_db = cursor.fetchone()
    old_avatar_path = current_actor_data_db.get("avatar_path") if current_actor_data_db else None
    new_avatar_filename = save_avatar(avatar_file, old_avatar_path)

    sql_update_parts = ["name = %s", "username = %s", "bio = %s"]
    params_update = [name, username, bio]

    if new_avatar_filename:
        sql_update_parts.append("avatar_path = %s")
        params_update.append(new_avatar_filename)
    if avatar_position is not None:
        sql_update_parts.append("avatar_position = %s")
        params_update.append(avatar_position)
    if avatar_size is not None:
        sql_update_parts.append("avatar_size = %s")
        params_update.append(avatar_size)

    if current_actor_type == "artist":
        instagram_link_data = request.form.get("instagram_link", "").strip()
        if not instagram_link_data:
            return jsonify({"message": "Link do Instagram é obrigatório para artistas."}), 400
        if not is_valid_instagram_url(instagram_link_data):
            return jsonify({"message": "Link do Instagram inválido para artista."}), 400
        
        sql_update_parts.append("instagram_link = %s")
        params_update.append(instagram_link_data)

    sql_update_query = f"UPDATE {target_table} SET {', '.join(sql_update_parts)} WHERE id = %s"
    params_update.append(actor_id)
    
    try:
        cursor.execute(sql_update_query, tuple(params_update))
    except Exception as e_update:
        current_app.logger.error(f"Erro ao atualizar perfil do ator tipo {current_actor_type} na tabela {target_table}: {e_update}, errno: {getattr(e_update, 'errno', None)}")
        if hasattr(e_update, 'errno') and e_update.errno == 1062:
            error_msg_lower = str(e_update).lower()
            if "username" in error_msg_lower:
                 return jsonify({"message": "Este nome de usuário já está em uso."}), 409
            if "email" in error_msg_lower:
                 return jsonify({"message": "Este e-mail já está em uso."}), 409
        return jsonify({"message": "Erro ao salvar dados. Verifique se as informações são únicas como nome de usuário ou e-mail."}), 500

    select_columns = "id, name, username, email, bio, avatar_path, avatar_position, avatar_size"
    if current_actor_type == "artist":
        select_columns += ", rg, cpf, instagram_link"
    
    cursor.execute(
        f"SELECT {select_columns} FROM {target_table} WHERE id = %s",
        (actor_id,),
    )
    updated_user_db = cursor.fetchone()
    
    updated_user_data = serialize_user(updated_user_db, current_actor_type)
    update_session_with_user_data(updated_user_data, current_actor_type)

    return jsonify({"message": "Perfil atualizado com sucesso!", "user": updated_user_data}), 200


@profile_bp.route("/api/user/password", methods=["POST"])
@login_required
@db_handler
def change_password_api(cursor):
    data = request.get_json()
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")

    if not current_password or not new_password:
        return jsonify({"message": "Senha atual e nova senha são obrigatórias."}), 400
    if len(new_password) < 8:
        return jsonify({"message": "A nova senha deve ter pelo menos 6 caracteres."}), 400

    actor_id = session["actor_id"]
    current_actor_type = session["actor_type"]
    target_table = "artists" if current_actor_type == "artist" else "users"

    cursor.execute(f"SELECT password FROM {target_table} WHERE id = %s", (actor_id,))
    actor_db_row = cursor.fetchone()

    if not actor_db_row or not bcrypt.checkpw(current_password.encode("utf-8"), actor_db_row["password"].encode("utf-8")):
        return jsonify({"message": "Sua senha atual está incorreta."}), 401

    hashed_password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    cursor.execute(
        f"UPDATE {target_table} SET password = %s WHERE id = %s",
        (hashed_password.decode("utf-8"), actor_id),
    )
    return jsonify({"message": "Senha alterada com sucesso!"}), 200
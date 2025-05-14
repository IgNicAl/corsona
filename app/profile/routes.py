from flask import request, jsonify, session
import bcrypt
from . import profile_bp
from ..utils import login_required, db_handler, serialize_user, update_session_with_user_data, save_avatar

@profile_bp.route("/api/user/update", methods=["POST"])
@login_required
@db_handler
def update_user_profile_api(cursor):
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

    user_id = session["user_id"]
    current_username = session.get("user_username")

    if username != current_username:
        cursor.execute(
            "SELECT id FROM users WHERE username = %s AND id != %s",
            (username, user_id),
        )
        if cursor.fetchone():
            return jsonify({"message": "Este nome de usuário já está em uso por outra conta."}), 409

    cursor.execute("SELECT avatar_path FROM users WHERE id = %s", (user_id,))
    current_user_data_db = cursor.fetchone()
    old_avatar_path = current_user_data_db.get("avatar_path") if current_user_data_db else None

    new_avatar_filename = save_avatar(avatar_file, old_avatar_path)

    sql_parts = ["UPDATE users SET name = %s, username = %s, bio = %s"]
    params = [name, username, bio]

    if new_avatar_filename:
        sql_parts.append("avatar_path = %s")
        params.append(new_avatar_filename)
    if avatar_position is not None:
        sql_parts.append("avatar_position = %s")
        params.append(avatar_position)
    if avatar_size is not None:
        sql_parts.append("avatar_size = %s")
        params.append(avatar_size)

    sql_query = ", ".join(sql_parts) + " WHERE id = %s"
    params.append(user_id)
    cursor.execute(sql_query, tuple(params))

    cursor.execute(
        "SELECT id, name, username, email, bio, avatar_path, avatar_position, avatar_size FROM users WHERE id = %s",
        (user_id,),
    )
    updated_user_db = cursor.fetchone()
    updated_user_data = serialize_user(updated_user_db)
    update_session_with_user_data(updated_user_data)

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
    if len(new_password) < 6:
        return jsonify({"message": "A nova senha deve ter pelo menos 6 caracteres."}), 400

    user_id = session["user_id"]
    cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
    user_db_row = cursor.fetchone()

    if not user_db_row or not bcrypt.checkpw(current_password.encode("utf-8"), user_db_row["password"].encode("utf-8")):
        return jsonify({"message": "Sua senha atual está incorreta."}), 401

    hashed_password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    cursor.execute(
        "UPDATE users SET password = %s WHERE id = %s",
        (hashed_password.decode("utf-8"), user_id),
    )
    return jsonify({"message": "Senha alterada com sucesso!"}), 200

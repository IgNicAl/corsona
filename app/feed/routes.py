from flask import session, redirect, url_for, render_template, jsonify, request, current_app
from . import feed_bp
from ..utils import login_required, db_handler, serialize_user, save_media_file, get_media_type
import os

@feed_bp.route("/")
@login_required
def feed_page():
    actor_type = session.get("actor_type")
    if actor_type == "artist":
        return render_template("feed/feed_artist.html")
    elif actor_type == "user":
        return render_template("feed/feed_user.html")
    else:
        current_app.logger.warning(f"Página de feed acessada com tipo de ator inválido ou ausente na sessão. ID do Usuário: {session.get('user_id')}, Tipo de Ator: {actor_type}")
        session.clear()
        login_url = url_for('auth.login', _external=True)
        if not request.is_secure and 'https://' in login_url:
            login_url = login_url.replace('https://', 'http://')
        return redirect(login_url)


@feed_bp.route("/api/user", methods=["GET"])
@login_required
@db_handler
def get_current_user_api(cursor):
    actor_id = session["actor_id"]
    actor_type = session["actor_type"]

    user_data_db = None
    if actor_type == "user":
        cursor.execute(
            "SELECT id, name, username, email, bio, avatar_path, avatar_position, avatar_size FROM users WHERE id = %s",
            (actor_id,),
        )
        user_data_db = cursor.fetchone()
    elif actor_type == "artist":
        cursor.execute(
            "SELECT id, name, username, email, bio, avatar_path, avatar_position, avatar_size, rg, cpf, instagram_link FROM artists WHERE id = %s",
            (actor_id,),
        )
        user_data_db = cursor.fetchone()

    if user_data_db:
        if actor_type == "artist":
            session['rg'] = user_data_db.get('rg')
            session['cpf'] = user_data_db.get('cpf')
            session['instagram_link'] = user_data_db.get('instagram_link')
            session.modified = True
        return jsonify({"user": serialize_user(user_data_db, actor_type)}), 200

    session.clear()
    return jsonify({"message": "Usuário não encontrado, sessão encerrada."}), 404

@feed_bp.route("/api/posts", methods=["POST"])
@login_required
@db_handler
def create_post_api(cursor):
    actor_id = session["actor_id"]
    actor_type = session["actor_type"]

    if actor_type != "artist":
        return jsonify({"message": "Apenas artistas podem criar publicações."}), 403

    content = request.form.get("content")
    media_file = request.files.get("media")
    post_type = request.form.get("post_type", "publication")

    if not content and not media_file:
        return jsonify({"message": "O post deve ter conteúdo ou uma mídia."}), 400
    if content and len(content.strip()) == 0 and not media_file:
        return jsonify({"message": "O conteúdo do post não pode ser apenas espaços em branco."}), 400

    if post_type not in ["publication", "event"]:
        return jsonify({"message": "Tipo de post inválido."}), 400

    media_path = None
    media_type_name = None
    if media_file:
        media_path = save_media_file(media_file)
        if not media_path:
            return jsonify({"message": "Falha ao salvar a mídia ou tipo de arquivo inválido."}), 400
        media_type_name = get_media_type(media_file.filename)

    try:
        cursor.execute(
            "INSERT INTO posts (actor_id, actor_type, content, media_path, media_type, post_type) VALUES (%s, %s, %s, %s, %s, %s)",
            (actor_id, actor_type, content if content else '', media_path, media_type_name, post_type)
        )
        new_post_id = cursor.lastrowid

        query_new_post = """
            SELECT
                p.id, p.actor_id AS user_id, p.actor_type, p.content, p.media_path, p.media_type, p.post_type, p.created_at,
                CASE
                    WHEN p.actor_type = 'user' THEN (SELECT u.username FROM users u WHERE u.id = p.actor_id)
                    WHEN p.actor_type = 'artist' THEN (SELECT a.username FROM artists a WHERE a.id = p.actor_id)
                END as username,
                CASE
                    WHEN p.actor_type = 'user' THEN (SELECT u.name FROM users u WHERE u.id = p.actor_id)
                    WHEN p.actor_type = 'artist' THEN (SELECT a.name FROM artists a WHERE a.id = p.actor_id)
                END as user_name,
                CASE
                    WHEN p.actor_type = 'user' THEN (SELECT u.avatar_path FROM users u WHERE u.id = p.actor_id)
                    WHEN p.actor_type = 'artist' THEN (SELECT a.avatar_path FROM artists a WHERE a.id = p.actor_id)
                END as user_avatar_path,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND actor_id = %s AND actor_type = %s) as liked_by_current_user,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM posts p
            WHERE p.id = %s
        """
        cursor.execute(query_new_post, (session["actor_id"], session["actor_type"], new_post_id))
        new_post = cursor.fetchone()

        if new_post:
             new_post['created_at'] = new_post['created_at'].isoformat() if new_post.get('created_at') else None

        return jsonify({"message": "Post criado com sucesso!", "post": new_post}), 201
    except Exception as e:
        current_app.logger.error(f"Erro ao criar post: {e}")
        return jsonify({"message": f"Erro interno ao criar o post: {str(e)}"}), 500

@feed_bp.route("/api/posts", methods=["GET"])
@login_required
@db_handler
def get_posts_api(cursor):
    current_actor_id = session["actor_id"]
    current_actor_type = session["actor_type"]
    filter_type = request.args.get('filter')
    search_query = request.args.get('query')

    base_query = """
        SELECT
            p.id, p.actor_id AS user_id, p.actor_type, p.content, p.media_path, p.media_type, p.post_type, p.created_at,
            CASE
                WHEN p.actor_type = 'user' THEN (SELECT u.username FROM users u WHERE u.id = p.actor_id)
                WHEN p.actor_type = 'artist' THEN (SELECT a.username FROM artists a WHERE a.id = p.actor_id)
            END as username,
            CASE
                WHEN p.actor_type = 'user' THEN (SELECT u.name FROM users u WHERE u.id = p.actor_id)
                WHEN p.actor_type = 'artist' THEN (SELECT a.name FROM artists a WHERE a.id = p.actor_id)
            END as user_name,
            CASE
                WHEN p.actor_type = 'user' THEN (SELECT u.avatar_path FROM users u WHERE u.id = p.actor_id)
                WHEN p.actor_type = 'artist' THEN (SELECT a.avatar_path FROM artists a WHERE a.id = p.actor_id)
            END as user_avatar_path,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND actor_id = %s AND actor_type = %s) as liked_by_current_user,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
    """

    params = [current_actor_id, current_actor_type]
    where_clauses = []

    if filter_type == 'audio':
        where_clauses.append("p.media_type = 'audio'")
    elif filter_type == 'event':
        where_clauses.append("p.post_type = 'event'")
    elif filter_type == 'media':
        where_clauses.append("p.media_type IN ('image', 'video')")

    if search_query:
        search_term_like = f"%{search_query}%"
        search_condition = """
        (
            p.content LIKE %s OR
            (p.actor_type = 'artist' AND (
                (SELECT art.name FROM artists art WHERE art.id = p.actor_id) LIKE %s OR
                (SELECT art.username FROM artists art WHERE art.id = p.actor_id) LIKE %s
            ))
        )
        """
        where_clauses.append(search_condition)
        params.extend([search_term_like, search_term_like, search_term_like])


    if where_clauses:
        base_query += " WHERE " + " AND ".join(where_clauses)

    base_query += " ORDER BY p.created_at DESC"

    cursor.execute(base_query, tuple(params))
    posts_db = cursor.fetchall()

    posts_list = []
    for post in posts_db:
        post_dict = dict(post)
        post_dict['created_at'] = post_dict['created_at'].isoformat() if post_dict.get('created_at') else None
        posts_list.append(post_dict)

    return jsonify({"posts": posts_list}), 200

@feed_bp.route("/api/posts/<int:post_id>/like", methods=["POST"])
@login_required
@db_handler
def toggle_like_post_api(cursor, post_id):
    actor_id = session["actor_id"]
    actor_type = session["actor_type"]

    cursor.execute("SELECT id FROM posts WHERE id = %s", (post_id,))
    if not cursor.fetchone():
        return jsonify({"message": "Post não encontrado."}), 404

    cursor.execute("SELECT id FROM likes WHERE actor_id = %s AND actor_type = %s AND post_id = %s", (actor_id, actor_type, post_id))
    like = cursor.fetchone()

    if like:
        cursor.execute("DELETE FROM likes WHERE actor_id = %s AND actor_type = %s AND post_id = %s", (actor_id, actor_type, post_id))
        liked = False
    else:
        cursor.execute("INSERT INTO likes (actor_id, actor_type, post_id) VALUES (%s, %s, %s)", (actor_id, actor_type, post_id))
        liked = True

    cursor.execute("SELECT COUNT(*) as count FROM likes WHERE post_id = %s", (post_id,))
    like_count = cursor.fetchone()['count']

    return jsonify({"message": "Sucesso", "liked": liked, "like_count": like_count}), 200

@feed_bp.route("/api/posts/<int:post_id>/comments", methods=["POST"])
@login_required
@db_handler
def add_comment_api(cursor, post_id):
    actor_id = session["actor_id"]
    actor_type = session["actor_type"]
    data = request.get_json()
    content = data.get("content")

    if not content or len(content.strip()) == 0:
        return jsonify({"message": "O conteúdo do comentário não pode estar vazio."}), 400

    cursor.execute("SELECT id FROM posts WHERE id = %s", (post_id,))
    if not cursor.fetchone():
        return jsonify({"message": "Post não encontrado."}), 404

    cursor.execute(
        "INSERT INTO comments (actor_id, actor_type, post_id, content) VALUES (%s, %s, %s, %s)",
        (actor_id, actor_type, post_id, content.strip())
    )
    new_comment_id = cursor.lastrowid

    query_new_comment = """
        SELECT
            c.id, c.actor_id AS user_id, c.actor_type, c.post_id, c.content, c.created_at,
            CASE
                WHEN c.actor_type = 'user' THEN (SELECT u.username FROM users u WHERE u.id = c.actor_id)
                WHEN c.actor_type = 'artist' THEN (SELECT a.username FROM artists a WHERE a.id = c.actor_id)
            END as username,
            CASE
                WHEN c.actor_type = 'user' THEN (SELECT u.name FROM users u WHERE u.id = c.actor_id)
                WHEN c.actor_type = 'artist' THEN (SELECT a.name FROM artists a WHERE a.id = c.actor_id)
            END as user_name,
            CASE
                WHEN c.actor_type = 'user' THEN (SELECT u.avatar_path FROM users u WHERE u.id = c.actor_id)
                WHEN c.actor_type = 'artist' THEN (SELECT a.avatar_path FROM artists a WHERE a.id = c.actor_id)
            END as user_avatar_path
        FROM comments c
        WHERE c.id = %s
    """
    cursor.execute(query_new_comment, (new_comment_id,))
    new_comment = cursor.fetchone()
    if new_comment:
        new_comment['created_at'] = new_comment['created_at'].isoformat() if new_comment.get('created_at') else None

    cursor.execute("SELECT COUNT(*) as count FROM comments WHERE post_id = %s", (post_id,))
    comment_count = cursor.fetchone()['count']

    return jsonify({"message": "Comentário adicionado!", "comment": new_comment, "comment_count": comment_count}), 201

@feed_bp.route("/api/posts/<int:post_id>/comments", methods=["GET"])
@login_required
@db_handler
def get_comments_api(cursor, post_id):
    cursor.execute("SELECT id FROM posts WHERE id = %s", (post_id,))
    if not cursor.fetchone():
        return jsonify({"message": "Post não encontrado."}), 404

    query_comments = """
        SELECT
            c.id, c.actor_id AS user_id, c.actor_type, c.post_id, c.content, c.created_at,
            CASE
                WHEN c.actor_type = 'user' THEN (SELECT u.username FROM users u WHERE u.id = c.actor_id)
                WHEN c.actor_type = 'artist' THEN (SELECT a.username FROM artists a WHERE a.id = c.actor_id)
            END as username,
            CASE
                WHEN c.actor_type = 'user' THEN (SELECT u.name FROM users u WHERE u.id = c.actor_id)
                WHEN c.actor_type = 'artist' THEN (SELECT a.name FROM artists a WHERE a.id = c.actor_id)
            END as user_name,
            CASE
                WHEN c.actor_type = 'user' THEN (SELECT u.avatar_path FROM users u WHERE u.id = c.actor_id)
                WHEN c.actor_type = 'artist' THEN (SELECT a.avatar_path FROM artists a WHERE a.id = c.actor_id)
            END as user_avatar_path
        FROM comments c
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC
    """
    cursor.execute(query_comments, (post_id,))
    comments_db = cursor.fetchall()

    comments_list = []
    for comment in comments_db:
        comment_dict = dict(comment)
        comment_dict['created_at'] = comment_dict['created_at'].isoformat() if comment_dict.get('created_at') else None
        comments_list.append(comment_dict)

    return jsonify({"comments": comments_list}), 200

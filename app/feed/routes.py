from flask import session, redirect, url_for, render_template, jsonify, request, current_app
from . import feed_bp
from ..utils import login_required, db_handler, serialize_user, save_avatar 
import os

@feed_bp.route("/")
@login_required
def feed_page():
    return render_template("feed/feed.html")

@feed_bp.route("/api/user", methods=["GET"])
@login_required
@db_handler
def get_current_user_api(cursor):
    user_id = session["user_id"]
    cursor.execute(
        "SELECT id, name, username, email, bio, avatar_path, avatar_position, avatar_size FROM users WHERE id = %s",
        (user_id,),
    )
    user_db_row = cursor.fetchone()
    if user_db_row:
        return jsonify({"user": serialize_user(user_db_row)}), 200

    session.clear()
    return jsonify({"message": "Usuário não encontrado, sessão encerrada."}), 404

@feed_bp.route("/api/posts", methods=["POST"])
@login_required
@db_handler
def create_post_api(cursor):
    user_id = session["user_id"]
    content = request.form.get("content")
    image_file = request.files.get("image")

    if not content and not image_file:
        return jsonify({"message": "O post deve ter conteúdo ou uma imagem."}), 400
    if content and len(content.strip()) == 0 and not image_file:
        return jsonify({"message": "O conteúdo do post não pode ser apenas espaços em branco."}), 400


    image_path = None
    if image_file:
        image_path = save_avatar(image_file) 
        if not image_path:
            return jsonify({"message": "Falha ao salvar a imagem ou tipo de arquivo inválido."}), 400

    try:
        cursor.execute(
            "INSERT INTO posts (user_id, content, image_path) VALUES (%s, %s, %s)",
            (user_id, content if content else '', image_path)
        )
        new_post_id = cursor.lastrowid
        
        cursor.execute("""
            SELECT p.id, p.user_id, p.content, p.image_path, p.created_at, 
                   u.username, u.name as user_name, u.avatar_path as user_avatar_path,
                   (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                   EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = %s) as liked_by_current_user,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = %s
        """, (user_id, new_post_id))
        new_post = cursor.fetchone()

        if new_post:
             new_post['created_at'] = new_post['created_at'].isoformat() if new_post.get('created_at') else None

        return jsonify({"message": "Post criado com sucesso!", "post": new_post}), 201
    except Exception as e:
        current_app.logger.error(f"Erro ao criar post: {e}")
        return jsonify({"message": "Erro interno ao criar o post."}), 500

@feed_bp.route("/api/posts", methods=["GET"])
@login_required
@db_handler
def get_posts_api(cursor):
    current_user_id = session["user_id"]
    cursor.execute("""
        SELECT p.id, p.user_id, p.content, p.image_path, p.created_at, 
               u.username, u.name as user_name, u.avatar_path as user_avatar_path,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
               EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = %s) as liked_by_current_user,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
    """, (current_user_id,))
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
    user_id = session["user_id"]
    
    cursor.execute("SELECT id FROM posts WHERE id = %s", (post_id,))
    if not cursor.fetchone():
        return jsonify({"message": "Post não encontrado."}), 404

    cursor.execute("SELECT id FROM likes WHERE user_id = %s AND post_id = %s", (user_id, post_id))
    like = cursor.fetchone()

    if like:
        cursor.execute("DELETE FROM likes WHERE user_id = %s AND post_id = %s", (user_id, post_id))
        liked = False
    else:
        cursor.execute("INSERT INTO likes (user_id, post_id) VALUES (%s, %s)", (user_id, post_id))
        liked = True
    
    cursor.execute("SELECT COUNT(*) as count FROM likes WHERE post_id = %s", (post_id,))
    like_count = cursor.fetchone()['count']

    return jsonify({"message": "Sucesso", "liked": liked, "like_count": like_count}), 200

@feed_bp.route("/api/posts/<int:post_id>/comments", methods=["POST"])
@login_required
@db_handler
def add_comment_api(cursor, post_id):
    user_id = session["user_id"]
    data = request.get_json()
    content = data.get("content")

    if not content or len(content.strip()) == 0:
        return jsonify({"message": "O conteúdo do comentário não pode estar vazio."}), 400

    cursor.execute("SELECT id FROM posts WHERE id = %s", (post_id,))
    if not cursor.fetchone():
        return jsonify({"message": "Post não encontrado."}), 404
    
    cursor.execute(
        "INSERT INTO comments (user_id, post_id, content) VALUES (%s, %s, %s)",
        (user_id, post_id, content.strip())
    )
    new_comment_id = cursor.lastrowid

    cursor.execute("""
        SELECT c.id, c.user_id, c.post_id, c.content, c.created_at,
               u.username, u.name as user_name, u.avatar_path as user_avatar_path
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = %s
    """, (new_comment_id,))
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

    cursor.execute("""
        SELECT c.id, c.user_id, c.post_id, c.content, c.created_at,
               u.username, u.name as user_name, u.avatar_path as user_avatar_path
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC
    """, (post_id,))
    comments_db = cursor.fetchall()

    comments_list = []
    for comment in comments_db:
        comment_dict = dict(comment)
        comment_dict['created_at'] = comment_dict['created_at'].isoformat() if comment_dict.get('created_at') else None
        comments_list.append(comment_dict)
        
    return jsonify({"comments": comments_list}), 200

from flask import request, jsonify, send_from_directory, session
import bcrypt
import mysql.connector
import os
import secrets

from . import app
from .db import get_db_connection, DB_NAME

app.secret_key = secrets.token_hex(16)

def get_project_static_dir(subdir_name):
    return os.path.join(app.config['PROJECT_ROOT'], subdir_name)

@app.route('/')
@app.route('/Login')
def serve_login_page():
    return send_from_directory(get_project_static_dir('Login'), 'Login.html')

@app.route('/Login/login.js')
def serve_login_js():
    return send_from_directory(get_project_static_dir('Login'), 'login.js')

@app.route('/Register')
def serve_register_page():
    return send_from_directory(get_project_static_dir('Register'), 'Register.html')

@app.route('/Feed')
def serve_feed_page():
    return send_from_directory(get_project_static_dir('Feed'), 'Feed.html')

@app.route('/Feed/styles.css')
def serve_feed_styles():
    return send_from_directory(get_project_static_dir('Feed'), 'styles.css')

@app.route('/Feed/feed.js')
def serve_feed_js():
    return send_from_directory(get_project_static_dir('Feed'), 'feed.js')

@app.route('/Register/register.js')
def serve_register_js():
    return send_from_directory(get_project_static_dir('Register'), 'register.js')

@app.route('/Login/styles.css')
def serve_login_styles():
    return send_from_directory(get_project_static_dir('Login'), 'styles.css')

@app.route('/Register/styles.css')
def serve_register_styles():
    return send_from_directory(get_project_static_dir('Register'), 'styles.css')

@app.route('/global.css')
def serve_global_css():
    return send_from_directory(app.config['PROJECT_ROOT'], 'global.css')

@app.route('/Logos/<path:filename>')
def serve_logos(filename):
    return send_from_directory(get_project_static_dir('Logos'), filename)

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    if not data or not all(k in data for k in ('name', 'username', 'email', 'password')):
        return jsonify({'message': 'Dados incompletos'}), 400
    name = data['name']
    username = data['username']
    email = data['email']
    password = data['password']
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn: return jsonify({'message': 'Erro de conexão com o banco de dados'}), 500
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
        if cursor.fetchone(): return jsonify({'message': 'E-mail já cadastrado'}), 409
        cursor.execute("SELECT username FROM users WHERE username = %s", (username,))
        if cursor.fetchone(): return jsonify({'message': 'Nome de usuário já cadastrado'}), 409
        sql = "INSERT INTO users (name, username, email, password) VALUES (%s, %s, %s, %s)"
        val = (name, username, email, hashed_password.decode('utf-8'))
        cursor.execute(sql, val)
        conn.commit()
        return jsonify({'message': 'Cadastro realizado com sucesso!'}), 201
    except mysql.connector.Error as err:
        print(f"Database error during registration: {err}")
        return jsonify({'message': f'Erro no banco de dados: {err}'}), 500
    except Exception as e:
        print(f"Unexpected error during registration: {e}")
        return jsonify({'message': 'Erro interno no servidor'}), 500
    finally:
        if cursor: cursor.close()
        if conn and conn.is_connected(): conn.close()

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    if not data or not all(k in data for k in ('identifier', 'password')):
        return jsonify({'message': 'Dados incompletos: identificador e senha são obrigatórios'}), 400
    identifier = data['identifier']
    password_attempt = data['password']
    conn = None
    cursor = None
    try:
        conn = get_db_connection(database_name=DB_NAME)
        if not conn: return jsonify({'message': 'Erro de conexão com o banco de dados'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s OR username = %s", (identifier, identifier))
        user = cursor.fetchone()
        if user and bcrypt.checkpw(password_attempt.encode('utf-8'), user['password'].encode('utf-8')):
            session['user_id'] = user['id']
            session['user_name'] = user['name']
            session['user_email'] = user['email']
            session['user_username'] = user['username']
            return jsonify({'message': 'Login bem-sucedido!', 'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'username': user['username']}}), 200
        else:
            return jsonify({'message': 'Usuário ou senha inválidos'}), 401
    except mysql.connector.Error as err:
        print(f"Database error during login: {err}")
        return jsonify({'message': f'Erro no banco de dados: {err}'}), 500
    except Exception as e:
        print(f"Unexpected error during login: {e}")
        return jsonify({'message': 'Erro interno no servidor'}), 500
    finally:
        if cursor: cursor.close()
        if conn and conn.is_connected(): conn.close()

@app.route('/api/user', methods=['GET'])
def get_user():
    if 'user_id' in session:
        return jsonify({
            'user': {
                'id': session['user_id'],
                'name': session['user_name'],
                'email': session['user_email'],
                'username': session['user_username']
            }
        }), 200
    else:
        return jsonify({'message': 'Usuário não está logado'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout realizado com sucesso'}), 200
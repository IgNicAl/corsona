from flask import Blueprint, send_from_directory, current_app, jsonify, session, url_for, redirect

main_bp = Blueprint('main', __name__)

@main_bp.route("/")
def index():
    if 'user_id' in session:
        return redirect(url_for('feed.feed_page'))
    return redirect(url_for('auth.login'))

@main_bp.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@main_bp.route("/debug/session")
def debug_session():
    return jsonify({
        "status": "Autenticado" if "user_id" in session else "Não autenticado",
        "session_data": dict(session)
    })

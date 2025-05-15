from flask import Flask
import os
from flask_session import Session
from .config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)

    from .db import init_app as init_db_app
    init_db_app(app)

    Session(app)

    from .auth.routes import auth_bp
    from .feed.routes import feed_bp
    from .profile.routes import profile_bp
    from .main_routes import main_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(feed_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(main_bp)

    return app

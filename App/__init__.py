from flask import Flask
import os
import secrets
from flask_session import Session

app = Flask(__name__)

app.config["PROJECT_ROOT"] = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = True
app.config["SESSION_USE_SIGNER"] = True
app.config["SESSION_FILE_DIR"] = os.path.join(
    app.config["PROJECT_ROOT"], "flask_session"
)
app.config["PERMANENT_SESSION_LIFETIME"] = 3600 * 24 * 30

os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)

Session(app)

from . import routes

from flask import Flask
import os

app = Flask(__name__)

app.config['PROJECT_ROOT'] = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

from . import routes
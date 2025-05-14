from App import app
from App.db import init_db

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
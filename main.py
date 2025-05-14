from App import app
from App.db import init_db

if __name__ == '__main__':
    print("Starting application from main.py...")
    print("Calling init_db()...")
    init_db()
    print("init_db() process finished.")
    print(f"Starting Flask app on port 5000 with debug True...")
    app.run(debug=True, port=5000)
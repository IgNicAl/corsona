import os
import sys
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.dirname(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

dotenv_path = os.path.join(project_root, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    print(f"AVISO: Arquivo .env não encontrado em {dotenv_path}. As configurações podem não ser carregadas corretamente.")

from app import create_app

app = create_app()

if __name__ == '__main__':
    if not app.config.get('DB_USER') or not app.config.get('DB_PASSWORD'):
        print("ERRO CRÍTICO: DB_USER ou DB_PASSWORD não estão configurados.")
        print("Verifique seu arquivo .env e se ele está sendo carregado corretamente.")
        sys.exit(1)

    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000  )))

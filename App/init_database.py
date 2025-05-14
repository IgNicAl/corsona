#!/usr/bin/env python3
from App.db import init_db

if __name__ == "__main__":
    print("Iniciando a criação/verificação do banco de dados...")
    init_db()
    print("Processo finalizado.") 
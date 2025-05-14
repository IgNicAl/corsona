# Corsona

Rede social para artistas TB.

## Configuração do Ambiente

### 1. Instalar dependências

```bash
pip install -r requirements.txt
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
DB_HOST=localhost
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=corsona
SECRET_KEY=sua_chave_secreta_aleatoria
```

Onde:

- `seu_usuario_mysql` é o seu nome de usuário do MySQL
- `sua_senha_mysql` é a senha do MySQL
- `sua_chave_secreta_aleatoria` deve ser uma string aleatória para segurança das sessões (pode usar: `python -c "import secrets; print(secrets.token_hex(16))"`)

### 3. Iniciar o servidor

```bash
python main.py
```

Acesse o site em: http://localhost:5000

## Solução de Problemas

### Problemas com login/sessão

Se você estiver enfrentando problemas onde o sistema redireciona constantemente para a página de login:

1. Verifique a conexão com o banco de dados
2. Limpe os cookies do navegador
3. Verifique se a pasta `flask_session` existe na raiz do projeto e tem permissões de escrita
4. Acesse http://localhost:5000/debug/session para ver o estado atual da sessão

### Erro nas rotas API

Verifique os logs do servidor. Mensagens detalhadas de erro serão exibidas no console.

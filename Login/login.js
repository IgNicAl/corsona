document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando script de login (login.js).');
    
    const loginForm = document.getElementById('loginForm') || document.querySelector('.login-container form'); 
    
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }
    
    console.log('Formulário encontrado:', loginForm);
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Formulário submetido, iniciando processo de login.');
        
        const identifierInput = document.getElementById('loginIdentifier');
        const passwordInput = document.getElementById('loginPassword');
        
        if (!identifierInput || !passwordInput) {
            alert('Erro interno: Campos de identificação ou senha não encontrados.');
            return;
        }
        
        const identifier = identifierInput.value;
        const password = passwordInput.value;
        
        console.log('Valores capturados - Identificador:', identifier ? identifier : 'vazio', 
                    'Senha:', password ? 'preenchida' : 'vazia');
        
        if (!identifier || !password) {
            alert('Por favor, preencha o e-mail ou nome de usuário e a senha.');
            return;
        }
        
        console.log('Enviando credenciais para o backend...');
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Login bem-sucedido via backend:', data);
                alert(data.message || 'Login realizado com sucesso! Bem-vindo(a) de volta.');
                loginForm.reset();

            } else {
                console.warn('Falha no login via backend:', data);
                alert(data.message || 'Erro ao fazer login. Verifique suas credenciais.');
            }

        } catch (error) {
            console.error('Erro na comunicação com o servidor:', error);
            alert('Erro ao tentar conectar com o servidor. Tente novamente mais tarde.');
        }
    });
});
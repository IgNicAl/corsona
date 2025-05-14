document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const identifierInput = document.getElementById('loginIdentifier');
            const passwordInput = document.getElementById('loginPassword');

            const identifier = identifierInput.value.trim();
            const password = passwordInput.value;

            if (!identifier || !password) {
                alert('Por favor, preencha o e-mail ou nome de usuário e a senha.');
                return;
            }

            try {
                const data = await apiRequest('/auth/login', 'POST', { identifier, password });
                if (data.user) {
                    window.location.href = '/feed/';
                } else {
                    alert(data.message || 'Erro ao fazer login. Verifique suas credenciais.');
                }
            } catch (error) {
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('name');
            const usernameInput = document.getElementById('username');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirmPassword');

            const name = nameInput.value.trim();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            const nameRegex = /^[A-Za-zÀ-ú\s]+$/;
            if (!nameRegex.test(name)) {
                alert('O nome deve conter apenas letras e espaços.');
                return;
            }
            if (username.includes(' ')) {
                alert('O nome de usuário não pode conter espaços.');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Por favor, insira um endereço de e-mail válido.');
                return;
            }
            if (password.length < 6) {
                alert('A senha deve ter pelo menos 6 caracteres.');
                return;
            }
            if (password !== confirmPassword) {
                alert('As senhas não coincidem!');
                return;
            }

            try {
                const data = await apiRequest('/auth/register', 'POST', { name, username, email, password });
                alert(data.message || 'Cadastro realizado com sucesso!');
                if (data.message && data.message.toLowerCase().includes('sucesso')) {
                    window.location.href = '/auth/login';
                }
            } catch (error) {
            }
        });
    }
});

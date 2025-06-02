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
                showCustomAlert('Por favor, preencha o e-mail ou nome de usuário e a senha.', 'error');
                return;
            }

            try {
                const data = await apiRequest('/login', 'POST', { identifier, password });
                if (data.user) {
                    window.location.href = '/feed/';
                }
            } catch (error) {
                console.error("Erro no login:", error);
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const userTypeSelect = document.getElementById('user_type');
        const artistFieldsDiv = document.getElementById('artistFieldsDiv');
        const rgInput = document.getElementById('rg');
        const cpfInput = document.getElementById('cpf');
        const instagramInput = document.getElementById('instagram_link');

        if (userTypeSelect && artistFieldsDiv) {
            userTypeSelect.addEventListener('change', function () {
                if (this.value === 'artist') {
                    artistFieldsDiv.style.display = 'block';
                } else {
                    artistFieldsDiv.style.display = 'none';
                }
            });
        }

        if (cpfInput) {
            cpfInput.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) value = value.substring(0, 11);

                if (value.length > 9) {
                    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                } else if (value.length > 6) {
                    value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                } else if (value.length > 3) {
                    value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                }
                e.target.value = value;
            });
        }


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
            const user_type = userTypeSelect.value;

            const nameRegex = /^[A-Za-zÀ-ú\s]+$/;
            if (!nameRegex.test(name)) {
                showCustomAlert('O nome deve conter apenas letras e espaços.', 'error');
                return;
            }
            if (username.includes(' ')) {
                showCustomAlert('O nome de usuário não pode conter espaços.', 'error');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showCustomAlert('Por favor, insira um endereço de e-mail válido.', 'error');
                return;
            }
            if (password.length < 8) {
                showCustomAlert('A senha deve ter pelo menos 8 caracteres.', 'error');
                return;
            }
            if (password !== confirmPassword) {
                showCustomAlert('As senhas não coincidem!', 'error');
                return;
            }

            const registrationData = {
                name,
                username,
                email,
                password,
                user_type
            };

            if (user_type === 'artist') {
                const rg = rgInput.value.trim();
                const cpf = cpfInput.value.trim();
                const instagram_link = instagramInput.value.trim();

                if (!rg) {
                    showCustomAlert('RG é obrigatório para artistas.', 'error'); return;
                }
                if (!cpf) {
                    showCustomAlert('CPF é obrigatório para artistas.', 'error'); return;
                }
                if (!instagram_link) {
                    showCustomAlert('Link do Instagram é obrigatório para artistas.', 'error'); return;
                }

                registrationData.rg = rg;
                registrationData.cpf = cpf;
                registrationData.instagram_link = instagram_link;
            }

            try {
                const data = await apiRequest('/register', 'POST', registrationData);
                if (data.message && data.message.toLowerCase().includes('sucesso')) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error("Erro no cadastro:", error);
            }
        });
    }
});

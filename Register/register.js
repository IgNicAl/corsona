document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const nameRegex = /^[A-Za-zÀ-ú\s]+$/;
    if (!nameRegex.test(name)) {
        alert('O nome deve conter apenas letras.');
        return;
    }

    const usernameRegex = /^\S+$/;
    if (!usernameRegex.test(username)) {
        alert('O nome de usuário não pode conter espaços.');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Por favor, insira um endereço de e-mail válido.');
        return;
    }

    if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                username,
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Cadastro realizado com sucesso!');
            window.location.href = '/Login';
        } else {
            alert(data.message || 'Erro ao realizar cadastro');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao realizar cadastro. Tente novamente.');
    }
});
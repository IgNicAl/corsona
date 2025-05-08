document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

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
                email,
                password
            })
        });

        if (response.ok) {
            alert('Cadastro realizado com sucesso!');
            window.location.href = 'Login.html';
        } else {
            const data = await response.json();
            alert(data.message || 'Erro ao realizar cadastro');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao realizar cadastro. Tente novamente.');
    }
}); 
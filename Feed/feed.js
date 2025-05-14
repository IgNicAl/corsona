document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();

        if (response.ok && data.user) {
            document.getElementById('userName').textContent = data.user.name;
            document.getElementById('userUsername').textContent = '@' + data.user.username;
        } else {
            window.location.href = '/Login';
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        window.location.href = '/Login';
    }
    
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    window.location.href = '/Login';
                } else {
                    console.error('Erro ao fazer logout');
                }
            } catch (error) {
                console.error('Erro na comunicação com o servidor:', error);
            }
        });
    }
}); 
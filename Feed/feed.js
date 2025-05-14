document.addEventListener('DOMContentLoaded', async () => {
    const bioDisplay = document.getElementById('bioDisplay');
    const profileAvatar = document.querySelector('.profile-img');
    const profileName = document.getElementById('userName');
    const profileUsername = document.getElementById('userUsername');

    let userData = null;

    try {
        console.log("Tentando carregar dados do usuário...");
        const response = await fetch('/api/user');
        console.log("Resposta da API:", response.status, response.statusText);

        if (response.status === 401) {
            console.error("Não autenticado (401), redirecionando para login");
            alert("Sua sessão expirou ou você não está autenticado. Redirecionando para o login.");
            window.location.href = '/Login';
            return;
        }

        if (!response.ok) {
            console.error("Resposta não ok:", response.status);
            const errorText = await response.text();
            console.error("Detalhes do erro:", errorText);
            alert(`Erro ao carregar dados do usuário: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        console.log("Dados recebidos:", data);

        if (data.user) {
            userData = data.user;

            profileName.textContent = userData.name;
            profileUsername.textContent = '@' + userData.username;

            if (userData.bio) {
                bioDisplay.textContent = userData.bio;
            }

        } else {
            console.error("Dados do usuário ausentes na resposta");
            alert("Erro ao obter dados do usuário: dados ausentes na resposta");
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        alert(`Erro ao carregar dados do usuário: ${error.message}`);
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
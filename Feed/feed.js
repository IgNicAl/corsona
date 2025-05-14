document.addEventListener('DOMContentLoaded', async () => {
    const sidebarProfileAvatar = document.getElementById('sidebarProfileAvatar');
    const bioDisplay = document.getElementById('bioDisplay');
    const profileName = document.getElementById('userName');
    const profileUsername = document.getElementById('userUsername');
    const stats = document.querySelectorAll('.profile-stats .stat-count');

    const defaultAvatar = '/Logos/avatar-default.svg';

    const updateProfileUI = (user) => {
        if (user) {
            profileName.textContent = user.name || 'Nome Completo';
            profileUsername.textContent = '@' + (user.username || 'username');
            bioDisplay.textContent = user.bio || 'Aqui vai uma breve descrição do usuário.';

            if (user.avatar_path) {
                sidebarProfileAvatar.style.backgroundImage = `url('${user.avatar_path}')`;
                sidebarProfileAvatar.style.backgroundPosition = user.avatar_position || 'center';
                sidebarProfileAvatar.style.backgroundSize = user.avatar_size || 'cover';
            } else {
                sidebarProfileAvatar.style.backgroundImage = `url('${defaultAvatar}')`;
                sidebarProfileAvatar.style.backgroundPosition = 'center';
                sidebarProfileAvatar.style.backgroundSize = 'cover';
            }
        } else {
            profileName.textContent = 'Carregando...';
            profileUsername.textContent = '@carregando';
            bioDisplay.textContent = 'Aqui vai uma breve descrição do usuário.';
            sidebarProfileAvatar.style.backgroundImage = `url('${defaultAvatar}')`;
            sidebarProfileAvatar.style.backgroundPosition = 'center';
            sidebarProfileAvatar.style.backgroundSize = 'cover';
            stats.forEach(stat => stat.textContent = '0');
        }
    };

    try {
        const response = await fetch('/api/user');

        if (response.status === 401) {
            alert("Sua sessão expirou ou você não está autenticado. Redirecionando para o login.");
            window.location.href = '/Login';
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            alert(`Erro ao carregar dados do usuário: ${response.status} ${response.statusText}`);
            updateProfileUI(null);
            return;
        }

        const data = await response.json();

        if (data.user) {
            updateProfileUI(data.user);
            window.currentUserData = data.user;
        } else {
            alert("Erro ao obter dados do usuário: dados ausentes na resposta");
            updateProfileUI(null);
        }
    } catch (error) {
        alert(`Erro ao carregar dados do usuário: ${error.message}`);
        updateProfileUI(null);
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
                    alert('Falha ao fazer logout.');
                }
            } catch (error) {
                alert('Erro de comunicação com o servidor ao fazer logout.');
            }
        });
    }

    document.addEventListener('profileUpdated', (event) => {
        updateProfileUI(event.detail.user);
        window.currentUserData = event.detail.user;
    });
});
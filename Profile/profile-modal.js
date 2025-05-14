document.addEventListener('DOMContentLoaded', () => {
    initProfileModule();
});
function initProfileModule() {

    const modal = document.getElementById('editProfileModal');
    const closeModalBtn = document.querySelector('.close');
    const editProfileBtn = document.getElementById('editProfileButton');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarInput = document.getElementById('avatarInput');
    const chooseAvatarButton = document.getElementById('chooseAvatarButton');
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const bioInput = document.getElementById('bioInput');
    const bioCharCount = document.getElementById('bioCharCount');
    const emailDisplay = document.getElementById('emailDisplay');
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const saveBioButton = document.getElementById('saveBioButton');
    const cancelButton = document.getElementById('cancelButton');
    const changePasswordButton = document.getElementById('changePasswordButton');


    const bioDisplay = document.getElementById('bioDisplay');
    const profileName = document.getElementById('userName');
    const profileUsername = document.getElementById('userUsername');


    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            getUserData().then(userData => {
                fillProfileModal(userData);
                modal.style.display = "block";
            });
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = "none";
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            modal.style.display = "none";
        });
    }


    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });


    if (chooseAvatarButton) {
        chooseAvatarButton.addEventListener('click', handleAvatarSelection);
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', previewAvatar);
    }

    if (bioInput) {
        bioInput.addEventListener('input', updateCharCounter);
    }

    if (saveBioButton) {
        saveBioButton.addEventListener('click', () => {
            saveProfile().then(updatedUserData => {

                updateUserInterface(updatedUserData);
            });
        });
    }

    if (changePasswordButton) {
        changePasswordButton.addEventListener('click', changePassword);
    }
}
async function getUserData() {
    try {
        const response = await fetch('/api/user');

        if (response.status === 401) {
            alert("Você precisa estar logado para acessar esta página.");
            window.location.href = '/Login';
            return null;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Erro ao carregar dados:", errorText);
            alert(`Erro ao carregar dados do usuário: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (data.user) {
            return data.user;
        } else {
            console.error("Dados do usuário ausentes na resposta");
            alert("Erro ao obter dados do usuário");
            return null;
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        alert(`Erro ao carregar dados do usuário: ${error.message}`);
        return null;
    }
}
function fillProfileModal(userData) {
    if (!userData) return;

    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const bioInput = document.getElementById('bioInput');
    const emailDisplay = document.getElementById('emailDisplay');
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const avatarPreview = document.getElementById('avatarPreview');

    nameInput.value = userData.name || '';
    usernameInput.value = userData.username || '';
    bioInput.value = userData.bio || '';
    emailDisplay.textContent = userData.email || 'Email não disponível';


    updateCharCounter();


    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';


    if (userData.avatar) {
        avatarPreview.src = userData.avatar;
    }
}
function updateUserInterface(userData) {
    if (!userData) return;

    const profileName = document.getElementById('userName');
    const profileUsername = document.getElementById('userUsername');
    const bioDisplay = document.getElementById('bioDisplay');

    profileName.textContent = userData.name;
    profileUsername.textContent = '@' + userData.username;

    if (userData.bio) {
        bioDisplay.textContent = userData.bio;
    } else {
        bioDisplay.textContent = 'Adicione uma bio...';
    }
}
function updateCharCounter() {
    const bioInput = document.getElementById('bioInput');
    const bioCharCount = document.getElementById('bioCharCount');

    if (!bioInput || !bioCharCount) return;

    const length = bioInput.value.length;
    bioCharCount.textContent = length;


    if (length > 130) {
        bioCharCount.style.color = "#e74c3c";
    } else {
        bioCharCount.style.color = "#8e8e8e";
    }
}
function handleAvatarSelection() {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.click();
    }
}
function previewAvatar(e) {
    const avatarPreview = document.getElementById('avatarPreview');
    if (!avatarPreview) return;

    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            avatarPreview.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}
async function saveProfile() {
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const bioInput = document.getElementById('bioInput');
    const avatarInput = document.getElementById('avatarInput');
    const saveBioButton = document.getElementById('saveBioButton');
    const modal = document.getElementById('editProfileModal');


    if (!nameInput.value.trim()) {
        alert('Nome não pode estar vazio');
        nameInput.focus();
        return null;
    }

    if (!usernameInput.value.trim()) {
        alert('Nome de usuário não pode estar vazio');
        usernameInput.focus();
        return null;
    }

    const bioContent = bioInput.value.trim();
    if (bioContent.length > 150) {
        alert('A bio deve ter no máximo 150 caracteres.');
        bioInput.focus();
        return null;
    }


    saveBioButton.disabled = true;
    saveBioButton.textContent = 'Salvando...';


    const formData = new FormData();
    formData.append('name', nameInput.value.trim());
    formData.append('username', usernameInput.value.trim());
    formData.append('bio', bioContent);


    if (avatarInput.files.length > 0) {
        formData.append('avatar', avatarInput.files[0]);
    }

    try {
        const response = await fetch('/api/user/profile', {
            method: 'POST',
            body: formData
        });


        saveBioButton.disabled = false;
        saveBioButton.textContent = 'Salvar Perfil';

        if (response.ok) {
            const data = await response.json();

            alert('Perfil atualizado com sucesso!');


            modal.style.display = "none";

            return data.user;
        } else {
            const errorData = await response.json();
            alert(`Erro ao atualizar perfil: ${errorData.message || 'Tente novamente mais tarde'}`);
            return null;
        }
    } catch (error) {

        saveBioButton.disabled = false;
        saveBioButton.textContent = 'Salvar Perfil';

        console.error('Erro na comunicação com o servidor:', error);
        alert('Erro ao atualizar perfil. Verifique sua conexão e tente novamente.');
        return null;
    }
}
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const changePasswordButton = document.getElementById('changePasswordButton');


    if (!currentPassword.value) {
        alert('A senha atual é obrigatória');
        currentPassword.focus();
        return;
    }

    if (!newPassword.value) {
        alert('A nova senha é obrigatória');
        newPassword.focus();
        return;
    }

    if (newPassword.value !== confirmPassword.value) {
        alert('As senhas não coincidem');
        confirmPassword.focus();
        return;
    }


    changePasswordButton.disabled = true;
    changePasswordButton.textContent = 'Atualizando...';


    try {
        const response = await fetch('/api/user/password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword.value,
                newPassword: newPassword.value
            })
        });


        changePasswordButton.disabled = false;
        changePasswordButton.textContent = 'Atualizar senha';

        if (response.ok) {

            currentPassword.value = '';
            newPassword.value = '';
            confirmPassword.value = '';

            alert('Senha alterada com sucesso!');
        } else {
            const errorData = await response.json();
            alert(`Erro ao alterar senha: ${errorData.message || 'Tente novamente mais tarde'}`);
        }
    } catch (error) {

        changePasswordButton.disabled = false;
        changePasswordButton.textContent = 'Atualizar senha';

        console.error('Erro na comunicação com o servidor:', error);
        alert('Erro ao alterar senha. Verifique sua conexão e tente novamente.');
    }
} 
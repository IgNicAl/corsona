document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('editProfileModal');
    const openModalButton = document.getElementById('editProfileButton');
    const closeModalSpan = modal.querySelector('.close');
    const saveProfileButton = document.getElementById('saveBioButton');
    const cancelButton = document.getElementById('cancelButton');

    const avatarInput = document.getElementById('avatarInput');
    const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const bioInput = document.getElementById('bioInput');
    const bioCharCount = document.getElementById('bioCharCount');
    const emailDisplay = document.getElementById('emailDisplay');

    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const changePasswordButton = document.getElementById('changePasswordButton');

    const defaultAvatar = '/Logos/avatar-default.svg';

    let isDragging = false;
    let startX, startY;
    let startBgPositionX, startBgPositionY;

    const openModal = () => {
        modal.style.display = 'block';
        loadCurrentUserProfile();

        if (avatarPreviewContainer) {
            avatarPreviewContainer.addEventListener('mousedown', handleMouseDown);
            avatarPreviewContainer.addEventListener('wheel', handleZoom, { passive: false });
        }
    };

    const closeModal = () => {
        modal.style.display = 'none';
        avatarInput.value = '';
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';

        if (avatarPreviewContainer) {
            avatarPreviewContainer.removeEventListener('mousedown', handleMouseDown);
            avatarPreviewContainer.removeEventListener('wheel', handleZoom);

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            isDragging = false;
            avatarPreviewContainer.style.cursor = 'grab';
        }
    };

    const loadCurrentUserProfile = async () => {
        const user = window.currentUserData;

        if (user) {
            nameInput.value = user.name || '';
            usernameInput.value = user.username || '';
            bioInput.value = user.bio || '';
            emailDisplay.textContent = user.email || 'N/A';

            if (user.avatar_path) {

                avatarPreviewContainer.style.backgroundImage = `url('${user.avatar_path}')`;
                avatarPreviewContainer.style.backgroundPosition = user.avatar_position || 'center';
                avatarPreviewContainer.style.backgroundSize = user.avatar_size || 'cover';
            } else {

                avatarPreviewContainer.style.backgroundImage = `url('${defaultAvatar}')`;
                avatarPreviewContainer.style.backgroundPosition = 'center';
                avatarPreviewContainer.style.backgroundSize = 'cover';
            }
            updateBioCharCount();
        } else {
            nameInput.value = '';
            usernameInput.value = '';
            bioInput.value = '';
            emailDisplay.textContent = 'Erro ao carregar';
            avatarPreviewContainer.style.backgroundImage = `url('${defaultAvatar}')`;
            avatarPreviewContainer.style.backgroundPosition = 'center';
            avatarPreviewContainer.style.backgroundSize = 'cover';
            updateBioCharCount();
            alert("Não foi possível carregar os dados do perfil.");
        }
    };

    if (openModalButton) openModalButton.addEventListener('click', openModal);
    if (closeModalSpan) closeModalSpan.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    if (bioInput) {
        bioInput.addEventListener('input', updateBioCharCount);
    }

    function updateBioCharCount() {
        if (bioInput && bioCharCount) {
            const currentLength = bioInput.value.length;
            bioCharCount.textContent = currentLength;
        }
    }

    if (avatarInput && avatarPreviewContainer) {
        avatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {

                    avatarPreviewContainer.style.backgroundImage = `url('${e.target.result}')`;
                    avatarPreviewContainer.style.backgroundPosition = 'center';
                    avatarPreviewContainer.style.backgroundSize = 'cover';
                };
                reader.readAsDataURL(file);
            } else {
            }
        });
    }

    const chooseAvatarButton = document.getElementById('chooseAvatarButton');
    if (chooseAvatarButton && avatarInput) {
        chooseAvatarButton.addEventListener('click', () => {
            avatarInput.click();
        });
    }

    // Lógica de arraste
    function handleMouseDown(e) {
        if (!avatarPreviewContainer.style.backgroundImage || avatarPreviewContainer.style.backgroundImage === 'none' || e.button !== 0) {
            return;
        }
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const bgPos = window.getComputedStyle(avatarPreviewContainer).backgroundPosition.split(' ');
        startBgPositionX = parseFloat(bgPos[0]);
        startBgPositionY = parseFloat(bgPos[1]);
        avatarPreviewContainer.style.cursor = 'grabbing';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        e.preventDefault();
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const newPxX = startBgPositionX + deltaX;
        const newPxY = startBgPositionY + deltaY;

        avatarPreviewContainer.style.backgroundPosition = `${newPxX}px ${newPxY}px`;
    }

    function handleMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (avatarPreviewContainer.style.backgroundImage && avatarPreviewContainer.style.backgroundImage !== 'none') {
            avatarPreviewContainer.style.cursor = 'grab';
        }
    }

    function handleZoom(e) {
        if (!avatarPreviewContainer.style.backgroundImage || avatarPreviewContainer.style.backgroundImage === 'none') {
            return;
        }
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.1 : 0.1;

        let currentSize = window.getComputedStyle(avatarPreviewContainer).backgroundSize;

        let currentPercent = 100;
        const sizeParts = currentSize.split(' ');

        if (sizeParts[0].endsWith('%')) {
            currentPercent = parseFloat(sizeParts[0]);
        } else if (sizeParts.length > 1 && sizeParts[1].endsWith('%')) {
            currentPercent = parseFloat(sizeParts[1]);
        } else if (currentSize === 'cover' || currentSize === 'contain') {
            if (currentSize === 'cover') {
                currentPercent = 100;
            } else if (currentSize === 'contain') {
                currentPercent = 100;
            } else {
                return;
            }
        }

        let newPercent = currentPercent + delta * 20; // Ajuste o fator de zoom (20 aqui)

        newPercent = Math.max(50, Math.min(500, newPercent));

        avatarPreviewContainer.style.backgroundSize = `${newPercent}% auto`;
    }

    if (saveProfileButton) {
        saveProfileButton.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const username = usernameInput.value.trim();
            const bio = bioInput.value.trim();
            const avatarFile = avatarInput.files[0];

            if (!name) {
                alert('Nome não pode estar vazio.');
                return;
            }
            if (!username) {
                alert('Nome de usuário não pode estar vazio.');
                return;
            }
            if (bio.length > 150) {
                alert('A descrição deve ter no máximo 150 caracteres.');
                return;
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('username', username);
            formData.append('bio', bio);

            const computedPosition = window.getComputedStyle(avatarPreviewContainer).backgroundPosition;
            const computedSize = window.getComputedStyle(avatarPreviewContainer).backgroundSize;

            formData.append('avatar_position', computedPosition);
            formData.append('avatar_size', computedSize);


            if (avatarFile) {
                formData.append('avatar', avatarFile);

            } else { }


            try {
                const response = await fetch('/api/user/profile', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    closeModal();

                    const event = new CustomEvent('profileUpdated', { detail: { user: result.user } });
                    document.dispatchEvent(event);

                } else {
                    alert(`Erro ao salvar perfil: ${result.message}`);
                }
            } catch (error) {
                alert(`Erro ao salvar perfil: ${error.message}`);
            }
        });
    }

    if (changePasswordButton) {
        changePasswordButton.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Por favor, preencha todos os campos de senha.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('A nova senha e a confirmação de senha não coincidem.');
                return;
            }

            if (newPassword.length < 6) {
                alert('A nova senha deve ter pelo menos 6 caracteres.');
                return;
            }

            try {
                const response = await fetch('/api/user/password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    currentPasswordInput.value = '';
                    newPasswordInput.value = '';
                    confirmPasswordInput.value = '';
                } else {
                    alert(`Erro ao alterar senha: ${result.message}`);
                }
            } catch (error) {
                alert(`Erro ao alterar senha: ${error.message}`);
            }
        });
    }

    updateBioCharCount();
});
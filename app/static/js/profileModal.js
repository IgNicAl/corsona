document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('editProfileModal');
    const openModalButton = document.getElementById('editProfileButton');
    const closeModalButton = document.querySelector('#editProfileModal .close-modal-button');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const cancelProfileButton = document.getElementById('cancelProfileButton');

    const avatarInput = document.getElementById('avatarInput');
    const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
    const chooseAvatarButton = document.getElementById('chooseAvatarButton');
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const bioInput = document.getElementById('bioInput');
    const bioCharCount = document.getElementById('bioCharCount');
    const emailDisplay = document.getElementById('emailDisplay');

    const rgDisplay = document.getElementById('rgDisplay');
    const cpfDisplay = document.getElementById('cpfDisplay');
    const instagramLinkInputModal = document.getElementById('instagramLinkInputModal');

    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const changePasswordButton = document.getElementById('changePasswordButton');

    const defaultAvatarUrlInModal = avatarPreviewContainer ?
        (avatarPreviewContainer.style.backgroundImage.slice(5, -2) || '/static/images/logos/avatar-default.svg')
        : '/static/images/logos/avatar-default.svg';


    let isDragging = false;
    let startX, startY;
    let startBgPositionXPercent, startBgPositionYPercent;

    const parseCssValue = (valueString) => {
        const value = parseFloat(valueString);
        const unit = valueString.replace(/[0-9.-]/g, '');
        return { value, unit };
    };

    const parseBackgroundPosition = (bgPosStr) => {
        if (!bgPosStr || bgPosStr === 'initial' || bgPosStr === 'inherit' || bgPosStr === 'none') return { x: 50, y: 50, unitX: '%', unitY: '%' };
        const parts = bgPosStr.split(' ');
        const xParsed = parseCssValue(parts[0]);
        const yParsed = parts[1] ? parseCssValue(parts[1]) : xParsed;
        return { x: xParsed.value, y: yParsed.value, unitX: xParsed.unit, unitY: yParsed.unit };
    };

    const parseBackgroundSize = (bgSizeStr) => {
        if (!bgSizeStr || bgSizeStr === 'cover' || bgSizeStr === 'contain' || bgSizeStr === 'auto' || bgSizeStr === 'initial' || bgSizeStr === 'inherit' || bgSizeStr === 'none') return { value: 100, unit: '%' };
        const sizePart = bgSizeStr.split(' ')[0];
        return parseCssValue(sizePart);
    };


    const openModal = () => {
        if (!modal) return;
        modal.style.display = 'flex';
        loadCurrentUserProfile();

        if (avatarPreviewContainer) {
            avatarPreviewContainer.addEventListener('mousedown', handleMouseDown);
            avatarPreviewContainer.addEventListener('wheel', handleZoom, { passive: false });
        }
    };

    const closeModal = () => {
        if (!modal) return;
        modal.style.display = 'none';
        if (avatarInput) avatarInput.value = '';
        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';

        if (avatarPreviewContainer) {
            avatarPreviewContainer.removeEventListener('mousedown', handleMouseDown);
            avatarPreviewContainer.removeEventListener('wheel', handleZoom);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            isDragging = false;
            avatarPreviewContainer.style.cursor = 'grab';
        }
    };

    const loadCurrentUserProfile = () => {
        const user = window.currentUserData;

        if (!nameInput || !usernameInput || !bioInput || !emailDisplay || !avatarPreviewContainer) return;

        if (user) {
            nameInput.value = user.name || '';
            usernameInput.value = user.username || '';
            bioInput.value = user.bio || '';
            emailDisplay.textContent = user.email || 'N/A';

            if (user.avatar_path) {
                avatarPreviewContainer.style.backgroundImage = `url('${user.avatar_path}')`;
                avatarPreviewContainer.style.backgroundPosition = user.avatar_position || '50% 50%';
                avatarPreviewContainer.style.backgroundSize = user.avatar_size || 'cover';
            } else {
                avatarPreviewContainer.style.backgroundImage = `url('${defaultAvatarUrlInModal}')`;
                avatarPreviewContainer.style.backgroundPosition = '50% 50%';
                avatarPreviewContainer.style.backgroundSize = 'cover';
            }

            if (user.actor_type === 'artist') {
                if (rgDisplay) rgDisplay.textContent = user.rg || 'N/A';
                if (cpfDisplay) cpfDisplay.textContent = user.cpf || 'N/A';
                if (instagramLinkInputModal) instagramLinkInputModal.value = user.instagram_link || '';
            } else {
                if (rgDisplay) rgDisplay.textContent = 'N/A';
                if (cpfDisplay) cpfDisplay.textContent = 'N/A';
                if (instagramLinkInputModal) instagramLinkInputModal.value = '';
            }
            updateBioCharCount();
        } else {
            nameInput.value = '';
            usernameInput.value = '';
            bioInput.value = '';
            emailDisplay.textContent = 'Erro ao carregar';
            avatarPreviewContainer.style.backgroundImage = `url('${defaultAvatarUrlInModal}')`;
            avatarPreviewContainer.style.backgroundPosition = '50% 50%';
            avatarPreviewContainer.style.backgroundSize = 'cover';

            if (rgDisplay) rgDisplay.textContent = 'N/A';
            if (cpfDisplay) cpfDisplay.textContent = 'N/A';
            if (instagramLinkInputModal) instagramLinkInputModal.value = '';
            updateBioCharCount();
        }
    };

    if (openModalButton) openModalButton.addEventListener('click', openModal);
    if (closeModalButton) closeModalButton.addEventListener('click', closeModal);
    if (cancelProfileButton) cancelProfileButton.addEventListener('click', closeModal);

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

    if (chooseAvatarButton && avatarInput) {
        chooseAvatarButton.addEventListener('click', () => avatarInput.click());
    }

    if (avatarInput && avatarPreviewContainer) {
        avatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreviewContainer.style.backgroundImage = `url('${e.target.result}')`;
                    avatarPreviewContainer.style.backgroundPosition = '50% 50%';
                    avatarPreviewContainer.style.backgroundSize = 'cover';
                };
                reader.readAsDataURL(file);
            } else if (file) {
                alert("Por favor, selecione um arquivo de imagem válido (JPEG, PNG, GIF).");
                avatarInput.value = "";
            }
        });
    }

    function handleMouseDown(e) {
        if (!avatarPreviewContainer.style.backgroundImage || avatarPreviewContainer.style.backgroundImage === 'none' || e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const currentBgPos = parseBackgroundPosition(window.getComputedStyle(avatarPreviewContainer).backgroundPosition);
        startBgPositionXPercent = currentBgPos.x;
        startBgPositionYPercent = currentBgPos.y;

        if (currentBgPos.unitX !== '%' || currentBgPos.unitY !== '%') {
            const previewRect = avatarPreviewContainer.getBoundingClientRect();
            if (currentBgPos.unitX === 'px') startBgPositionXPercent = (currentBgPos.x / previewRect.width) * 100;
            if (currentBgPos.unitY === 'px') startBgPositionYPercent = (currentBgPos.y / previewRect.height) * 100;
        }


        avatarPreviewContainer.style.cursor = 'grabbing';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const previewRect = avatarPreviewContainer.getBoundingClientRect();
        if (previewRect.width === 0 || previewRect.height === 0) return;


        const newPosXPercent = startBgPositionXPercent + (deltaX / previewRect.width) * 100;
        const newPosYPercent = startBgPositionYPercent + (deltaY / previewRect.height) * 100;

        avatarPreviewContainer.style.backgroundPosition = `${newPosXPercent}% ${newPosYPercent}%`;
    }

    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (avatarPreviewContainer) avatarPreviewContainer.style.cursor = 'grab';
    }

    function handleZoom(e) {
        if (!avatarPreviewContainer.style.backgroundImage || avatarPreviewContainer.style.backgroundImage === 'none') return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;

        let currentSize = parseBackgroundSize(window.getComputedStyle(avatarPreviewContainer).backgroundSize);
        let currentSizePercent = currentSize.value;

        if (currentSize.unit !== '%') {
            const previewRect = avatarPreviewContainer.getBoundingClientRect();
            if (previewRect.width > 0) {
                currentSizePercent = (currentSize.value / previewRect.width) * 100;
            } else {
                currentSizePercent = 100;
            }
        }

        let newSizePercent = currentSizePercent * (1 + delta);
        newSizePercent = Math.max(50, Math.min(500, newSizePercent));
        avatarPreviewContainer.style.backgroundSize = `${newSizePercent}%`;
    }


    if (saveProfileButton) {
        saveProfileButton.addEventListener('click', async () => {
            if (!nameInput || !usernameInput || !bioInput) return;

            const name = nameInput.value.trim();
            const username = usernameInput.value.trim();
            const bio = bioInput.value.trim();
            const avatarFile = avatarInput ? avatarInput.files[0] : null;

            if (!name) { alert('Nome não pode estar vazio.'); return; }
            if (!username) { alert('Nome de usuário não pode estar vazio.'); return; }
            if (username.includes(' ')) { alert('Nome de usuário não pode conter espaços.'); return; }
            if (bio.length > 150) { alert('A descrição deve ter no máximo 150 caracteres.'); return; }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('username', username);
            formData.append('bio', bio);

            if (avatarPreviewContainer) {
                formData.append('avatar_position', window.getComputedStyle(avatarPreviewContainer).backgroundPosition);
                formData.append('avatar_size', window.getComputedStyle(avatarPreviewContainer).backgroundSize);
            }

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            if (window.currentUserData && window.currentUserData.actor_type === 'artist' && instagramLinkInputModal) {
                formData.append('instagram_link', instagramLinkInputModal.value.trim());
            }


            try {
                const result = await apiRequest('/profile/api/user/update', 'POST', formData, true);
                alert(result.message || "Perfil atualizado com sucesso!");
                closeModal();
                document.dispatchEvent(new CustomEvent('profileUpdatedGlobal', { detail: { user: result.user } }));
            } catch (error) {

            }
        });
    }

    if (changePasswordButton) {
        changePasswordButton.addEventListener('click', async () => {
            if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) return;

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Por favor, preencha todos os campos de senha.');
                return;
            }
            if (newPassword.length < 8) {
                alert('A nova senha deve ter pelo menos 8 caracteres.');
                return;
            }
            if (newPassword !== confirmPassword) {
                alert('A nova senha e a confirmação de senha não coincidem.');
                return;
            }

            try {
                const result = await apiRequest('/profile/api/user/password', 'POST', { currentPassword, newPassword });
                alert(result.message || "Senha alterada com sucesso!");
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
            } catch (error) {
            }
        });
    }
    updateBioCharCount();
});
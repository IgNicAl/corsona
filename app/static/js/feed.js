document.addEventListener('DOMContentLoaded', async () => {
    const sidebarProfileAvatar = document.getElementById('sidebarProfileAvatar');
    const bioDisplay = document.getElementById('bioDisplay');
    const profileName = document.getElementById('userName');
    const profileUsername = document.getElementById('userUsername');
    const userPostCountElement = document.getElementById('userPostCount');

    const createPostForm = document.getElementById('createPostForm');
    const postContentInput = document.getElementById('postContent');
    const postImageInput = document.getElementById('postImage');
    const postImageNameDisplay = document.getElementById('postImageName');
    const postsContainer = document.getElementById('postsContainer');
    const postPlaceholder = document.getElementById('postPlaceholder');

    const defaultAvatarUrl = sidebarProfileAvatar ?
        (sidebarProfileAvatar.style.backgroundImage.slice(5, -2) || '/static/images/logos/avatar-default.svg')
        : '/static/images/logos/avatar-default.svg';

    const updateProfileUI = (user) => {
        if (!profileName || !profileUsername || !bioDisplay || !sidebarProfileAvatar) {
            console.error("Elementos da UI do perfil não encontrados no DOM.");
            return;
        }

        if (user) {
            profileName.textContent = user.name || 'Nome Completo';
            profileUsername.textContent = '@' + (user.username || 'username');
            bioDisplay.textContent = user.bio || 'Aqui vai uma breve descrição do usuário.';

            if (user.avatar_path) {
                sidebarProfileAvatar.style.backgroundImage = `url('${user.avatar_path}')`;
                if (user.avatar_position) sidebarProfileAvatar.style.backgroundPosition = user.avatar_position;
                if (user.avatar_size) sidebarProfileAvatar.style.backgroundSize = user.avatar_size;
            } else {
                sidebarProfileAvatar.style.backgroundImage = `url('${defaultAvatarUrl}')`;
                sidebarProfileAvatar.style.backgroundPosition = 'center';
                sidebarProfileAvatar.style.backgroundSize = 'cover';
            }
            if (postContentInput) {
                postContentInput.placeholder = `No que você está pensando, ${user.name || 'Artista'}?`;
            }
        } else {
            profileName.textContent = 'Carregando...';
            profileUsername.textContent = '@carregando';
            bioDisplay.textContent = 'Aqui vai uma breve descrição do usuário.';
            sidebarProfileAvatar.style.backgroundImage = `url('${defaultAvatarUrl}')`;
            sidebarProfileAvatar.style.backgroundPosition = 'center';
            sidebarProfileAvatar.style.backgroundSize = 'cover';
            if (postContentInput) {
                postContentInput.placeholder = `No que você está pensando?`;
            }
        }
    };

    const formatTimeAgo = (isoString) => {
        if (!isoString) return 'algum tempo atrás';
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.round((now - date) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);
        const weeks = Math.round(days / 7);
        const months = Math.round(days / 30);
        const years = Math.round(days / 365);

        if (seconds < 5) return 'agora mesmo';
        if (seconds < 60) return `${seconds}s atrás`;
        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        if (days < 7) return `${days}d atrás`;
        if (weeks < 5) return `${weeks} sem atrás`;
        if (months < 12) return `${months} meses atrás`;
        return `${years}a atrás`;
    };

    const renderPost = (post, currentUser) => {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post');
        postDiv.dataset.postId = post.id;

        const defaultUserAvatar = '/static/images/logos/avatar-default.svg';
        const userAvatar = post.user_avatar_path || defaultUserAvatar;
        const postImageHTML = post.image_path ?
            `<div class="publication-image"><img src="${post.image_path}" alt="Imagem da Publicação" loading="lazy"></div>` : '';

        const likedClass = post.liked_by_current_user ? 'liked' : '';
        const likeIconClass = post.liked_by_current_user ? 'fas' : 'far';

        postDiv.innerHTML = `
            <div class="post-header">
                <div class="avatar"><img src="${userAvatar}" alt="Avatar de ${post.user_name || post.username}" loading="lazy"></div>
                <div class="post-author-info">
                    <h3 class="artist-name">${post.user_name || post.username}</h3>
                    <p class="time-ago" title="${new Date(post.created_at).toLocaleString()}">${formatTimeAgo(post.created_at)}</p>
                </div>
            </div>
            <div class="post-content">
                <p class="publication-text">${post.content.replace(/\n/g, '<br>')}</p>
                ${postImageHTML}
            </div>
            <div class="post-stats">
                <span class="like-count-display">${post.like_count || 0} curtida${post.like_count !== 1 ? 's' : ''}</span>
                <span class="comment-count-display">${post.comment_count || 0} comentário${post.comment_count !== 1 ? 's' : ''}</span>
            </div>
            <div class="post-actions">
                <button class="like-button ${likedClass}" data-post-id="${post.id}">
                    <i class="${likeIconClass} fa-heart"></i> <span class="like-text">Curtir</span>
                </button>
                <button class="comment-button" data-post-id="${post.id}">
                    <i class="far fa-comment"></i> Comentar
                </button>
                <button class="share-button" data-post-id="${post.id}">
                    <i class="far fa-paper-plane"></i> Compartilhar
                </button>
            </div>
            <div class="comments-section" id="comments-section-${post.id}" style="display: none;">
                <div class="comments-list" id="comments-list-${post.id}"></div>
                <form class="add-comment-form" data-post-id="${post.id}">
                    <input type="text" class="comment-input" placeholder="Adicione um comentário..." required>
                    <button type="submit" class="submit-comment-button">Enviar</button>
                </form>
            </div>
        `;
        return postDiv;
    };

    const renderComment = (comment) => {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment');
        const defaultUserAvatar = '/static/images/logos/avatar-default.svg';
        const userAvatar = comment.user_avatar_path || defaultUserAvatar;

        commentDiv.innerHTML = `
            <div class="comment-author-avatar">
                <img src="${userAvatar}" alt="${comment.user_name || comment.username}" loading="lazy">
            </div>
            <div class="comment-content">
                <span class="comment-author-name">${comment.user_name || comment.username}</span>
                <p class="comment-text">${comment.content.replace(/\n/g, '<br>')}</p>
                <span class="comment-time">${formatTimeAgo(comment.created_at)}</span>
            </div>
        `;
        return commentDiv;
    };

    const loadAndDisplayComments = async (postId, commentsListDiv) => {
        try {
            const data = await apiRequest(`/feed/api/posts/${postId}/comments`, 'GET');
            commentsListDiv.innerHTML = ''; // Limpa comentários antigos
            if (data.comments && data.comments.length > 0) {
                data.comments.forEach(comment => {
                    commentsListDiv.appendChild(renderComment(comment));
                });
            } else {
                commentsListDiv.innerHTML = '<p class="no-comments">Nenhum comentário ainda.</p>';
            }
        } catch (error) {
            console.error(`Erro ao carregar comentários para o post ${postId}:`, error);
            commentsListDiv.innerHTML = '<p class="no-comments">Erro ao carregar comentários.</p>';
        }
    };

    const handlePostInteraction = async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const postId = target.dataset.postId;
        if (!postId) return;

        if (target.classList.contains('like-button')) {
            try {
                const response = await apiRequest(`/feed/api/posts/${postId}/like`, 'POST');
                const likeButton = target;
                const likeIcon = likeButton.querySelector('i');
                const likeText = likeButton.querySelector('.like-text'); // Assumindo que o texto está em um span
                const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
                const likeCountDisplay = postElement ? postElement.querySelector('.like-count-display') : null;

                if (response.liked) {
                    likeButton.classList.add('liked');
                    likeIcon.classList.remove('far');
                    likeIcon.classList.add('fas');
                    if (likeText) likeText.textContent = 'Curtiu';
                } else {
                    likeButton.classList.remove('liked');
                    likeIcon.classList.remove('fas');
                    likeIcon.classList.add('far');
                    if (likeText) likeText.textContent = 'Curtir';
                }
                if (likeCountDisplay) {
                    likeCountDisplay.textContent = `${response.like_count || 0} curtida${response.like_count !== 1 ? 's' : ''}`;
                }
            } catch (error) {
                console.error("Erro ao curtir:", error);
            }
        } else if (target.classList.contains('comment-button')) {
            const commentsSection = document.getElementById(`comments-section-${postId}`);
            const commentsListDiv = document.getElementById(`comments-list-${postId}`);
            if (commentsSection) {
                const isVisible = commentsSection.style.display === 'block';
                commentsSection.style.display = isVisible ? 'none' : 'block';
                if (!isVisible && commentsListDiv && commentsListDiv.children.length === 0) { // Carrega apenas se não estiver visível e vazio
                    await loadAndDisplayComments(postId, commentsListDiv);
                }
            }
        } else if (target.classList.contains('share-button')) {
            const postUrl = `${window.location.origin}/feed#post-${postId}`; // Placeholder URL
            try {
                await navigator.clipboard.writeText(`Confira este post: ${postUrl}`);
                alert("Link do post copiado para a área de transferência!");
            } catch (err) {
                alert("Não foi possível copiar o link. Você pode copiar manualmente: " + postUrl);
            }
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        const form = e.target;
        const postId = form.dataset.postId;
        const commentInput = form.querySelector('.comment-input');
        const content = commentInput.value.trim();

        if (!content) {
            alert("O comentário não pode estar vazio.");
            return;
        }

        try {
            const response = await apiRequest(`/feed/api/posts/${postId}/comments`, 'POST', { content });
            if (response.comment) {
                const commentsListDiv = document.getElementById(`comments-list-${postId}`);
                if (commentsListDiv) {
                    // Remove "Nenhum comentário ainda" se existir
                    const noCommentsP = commentsListDiv.querySelector('.no-comments');
                    if (noCommentsP) noCommentsP.remove();

                    commentsListDiv.appendChild(renderComment(response.comment));
                }
                commentInput.value = ''; // Limpa o input

                const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
                const commentCountDisplay = postElement ? postElement.querySelector('.comment-count-display') : null;
                if (commentCountDisplay) {
                    commentCountDisplay.textContent = `${response.comment_count || 0} comentário${response.comment_count !== 1 ? 's' : ''}`;
                }
            }
        } catch (error) {
            console.error("Erro ao adicionar comentário:", error);
        }
    };

    if (postsContainer) {
        postsContainer.addEventListener('click', handlePostInteraction);
        postsContainer.addEventListener('submit', (e) => {
            if (e.target.classList.contains('add-comment-form')) {
                handleAddComment(e);
            }
        });
    }


    const loadPosts = async () => {
        if (!postsContainer || !postPlaceholder) return;
        try {
            const data = await apiRequest('/feed/api/posts', 'GET');
            postsContainer.innerHTML = '';
            if (data.posts && data.posts.length > 0) {
                postPlaceholder.style.display = 'none';
                data.posts.forEach(post => {
                    postsContainer.appendChild(renderPost(post, window.currentUserData));
                });
                if (window.currentUserData && userPostCountElement) {
                    const userPosts = data.posts.filter(p => p.user_id === window.currentUserData.id);
                    userPostCountElement.textContent = userPosts.length;
                }

            } else {
                postsContainer.appendChild(postPlaceholder);
                postPlaceholder.style.display = 'block';
                if (userPostCountElement) userPostCountElement.textContent = '0';
            }
        } catch (error) {
            console.error("Erro ao carregar posts:", error);
            postsContainer.innerHTML = '';
            postsContainer.appendChild(postPlaceholder);
            postPlaceholder.style.display = 'block';
            postPlaceholder.innerHTML = '<p>Erro ao carregar publicações. Tente novamente mais tarde.</p>';
        }
    };


    if (createPostForm) {
        createPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!postContentInput) return;

            const content = postContentInput.value.trim();
            const imageFile = postImageInput ? postImageInput.files[0] : null;

            if (!content && !imageFile) {
                alert("A publicação deve ter conteúdo ou uma imagem.");
                return;
            }
            if (content && content.length === 0 && !imageFile) { // Se só tiver imagem, content pode ser vazio
                alert("O conteúdo da publicação não pode ser apenas espaços em branco se não houver imagem.");
                return;
            }


            const formData = new FormData();
            formData.append('content', content);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            try {
                const result = await apiRequest('/feed/api/posts', 'POST', formData, true);
                if (result.post) {
                    const newPostElement = renderPost(result.post, window.currentUserData);
                    if (postsContainer.firstChild && postsContainer.firstChild.id === 'postPlaceholder') {
                        postsContainer.innerHTML = '';
                    }
                    postsContainer.insertBefore(newPostElement, postsContainer.firstChild);
                    createPostForm.reset();
                    if (postImageNameDisplay) postImageNameDisplay.textContent = '';
                    if (userPostCountElement) {
                        userPostCountElement.textContent = parseInt(userPostCountElement.textContent || "0") + 1;
                    }
                }
                // Não mostrar alert de sucesso na criação, o post aparecendo já é o feedback.
            } catch (error) {
            }
        });
    }

    if (postImageInput && postImageNameDisplay) {
        postImageInput.addEventListener('change', () => {
            if (postImageInput.files.length > 0) {
                postImageNameDisplay.textContent = postImageInput.files[0].name;
            } else {
                postImageNameDisplay.textContent = '';
            }
        });
    }

    try {
        const userData = await apiRequest('/feed/api/user', 'GET');
        if (userData.user) {
            updateProfileUI(userData.user);
            window.currentUserData = userData.user; // Garante que currentUserData está definido
            await loadPosts();
        } else {
            updateProfileUI(null);
            await loadPosts();
        }
    } catch (error) {
        updateProfileUI(null);
        await loadPosts();
        if (error.message.includes("Autenticação requerida") || (error.response && error.response.status === 401)) {
            alert("Sua sessão expirou ou você não está autenticado. Redirecionando para o login.");
            window.location.href = '/auth/login';
        }
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await apiRequest('/auth/logout', 'POST');
                window.currentUserData = null;
                window.location.href = '/auth/login';
            } catch (error) {
            }
        });
    }

    document.addEventListener('profileUpdatedGlobal', async (event) => {
        if (event.detail && event.detail.user) {
            updateProfileUI(event.detail.user);
            window.currentUserData = event.detail.user;
            await loadPosts();
        }
    });
});

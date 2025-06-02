document.addEventListener('DOMContentLoaded', async () => {
    const sidebarProfileAvatar = document.getElementById('sidebarProfileAvatar');
    const bioDisplay = document.getElementById('bioDisplay');
    const profileName = document.getElementById('userName');
    const profileUsername = document.getElementById('userUsername');
    const userPostCountElement = document.getElementById('userPostCount');

    const createPostForm = document.getElementById('createPostForm');
    const postContentInput = document.getElementById('postContent');
    const postMediaInput = document.getElementById('postMedia');
    const postMediaNameDisplay = document.getElementById('postMediaName');
    const postTypeInput = document.getElementById('postType');

    const postsContainer = document.getElementById('postsContainer');
    const postPlaceholder = document.getElementById('postPlaceholder');
    const highlightsContainer = document.querySelector('.highlights-container');

    const defaultAvatarUrl = sidebarProfileAvatar ?
        (sidebarProfileAvatar.style.backgroundImage.slice(5, -2) || '/static/images/logos/avatar-default.svg')
        : '/static/images/logos/avatar-default.svg';

    let currentFilter = 'all';

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
            if (postContentInput && user.actor_type === 'artist') {
                 postContentInput.placeholder = `No que você está pensando, ${user.name || user.username}?`;
            } else if (postContentInput) {
                 postContentInput.placeholder = `No que você está pensando?`;
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

    const renderMediaElement = (mediaPath, mediaType) => {
        if (!mediaPath) return '';
        if (mediaType === 'image') {
            return `<div class="publication-media image"><img src="${mediaPath}" alt="Imagem da Publicação" loading="lazy"></div>`;
        } else if (mediaType === 'video') {
            return `<div class="publication-media video"><video controls src="${mediaPath}" loading="lazy"></video></div>`;
        } else if (mediaType === 'audio') {
            return `<div class="publication-media audio"><audio controls src="${mediaPath}" loading="lazy"></audio></div>`;
        }
        return '';
    };

    const renderPostTypeIcon = (postType) => {
        if (postType === 'event') {
            return '<i class="fas fa-calendar-alt post-type-icon" title="Evento"></i>';
        }
        return '';
    };

    const renderPost = (post, currentUser) => {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post');
        postDiv.dataset.postId = post.id;
        postDiv.dataset.postType = post.post_type;
        postDiv.dataset.mediaType = post.media_type || 'none';
        postDiv.dataset.userId = post.user_id;

        const defaultUserAvatar = '/static/images/logos/avatar-default.svg';
        const userAvatar = post.user_avatar_path || defaultUserAvatar;
        const mediaHTML = renderMediaElement(post.media_path, post.media_type);
        const postTypeIconHTML = renderPostTypeIcon(post.post_type);

        const likedClass = post.liked_by_current_user ? 'liked' : '';
        const likeIconClass = post.liked_by_current_user ? 'fas' : 'far';

        let postManagementHTML = '';
        if (currentUser && currentUser.actor_type === 'artist' && currentUser.id === post.user_id) {
            postManagementHTML = `
                <div class="post-manage-actions">
                    <button class="delete-post-button" data-post-id="${post.id}" title="Excluir Post">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        postDiv.innerHTML = `
            <div class="post-header">
                <div class="avatar"><img src="${userAvatar}" alt="Avatar de ${post.user_name || post.username}" loading="lazy"></div>
                <div class="post-author-info">
                    <h3 class="artist-name">${post.user_name || post.username}</h3>
                    <p class="time-ago" title="${new Date(post.created_at).toLocaleString()}">${formatTimeAgo(post.created_at)}</p>
                </div>
                ${postManagementHTML}
                <div class="post-type-indicator">${postTypeIconHTML}</div>
            </div>
            <div class="post-content">
                <p class="publication-text">${post.content ? post.content.replace(/\n/g, '<br>') : ''}</p>
                ${mediaHTML}
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

    const renderComment = (comment, parentPost) => {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment');
        commentDiv.dataset.commentId = comment.id;
        const defaultUserAvatar = '/static/images/logos/avatar-default.svg';
        const userAvatar = comment.user_avatar_path || defaultUserAvatar;

        let deleteButtonHTML = '';
        if (window.currentUserData && parentPost) {
            const isCommentOwner = window.currentUserData.id === comment.user_id && window.currentUserData.actor_type === comment.actor_type;
            const isArtistOwningPost = window.currentUserData.actor_type === 'artist' && window.currentUserData.id === parentPost.user_id;

            if (isCommentOwner || isArtistOwningPost) {
                deleteButtonHTML = `
                    <button class="delete-comment-button" data-post-id="${parentPost.id}" data-comment-id="${comment.id}" title="Excluir Comentário">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        }

        commentDiv.innerHTML = `
            <div class="comment-author-avatar">
                <img src="${userAvatar}" alt="${comment.user_name || comment.username}" loading="lazy">
            </div>
            <div class="comment-content">
                <span class="comment-author-name">${comment.user_name || comment.username}</span>
                ${deleteButtonHTML}
                <p class="comment-text">${comment.content.replace(/\n/g, '<br>')}</p>
                <span class="comment-time">${formatTimeAgo(comment.created_at)}</span>
            </div>
        `;
        return commentDiv;
    };

    const loadAndDisplayComments = async (postId, commentsListDiv, parentPost) => {
        try {
            const data = await apiRequest(`/feed/api/posts/${postId}/comments`, 'GET');
            commentsListDiv.innerHTML = '';
            if (data.comments && data.comments.length > 0) {
                data.comments.forEach(comment => {
                    commentsListDiv.appendChild(renderComment(comment, parentPost));
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

        if (target.classList.contains('delete-post-button')) {
            const currentPostId = target.dataset.postId;
            if (!currentPostId) return;
            if (confirm("Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.")) {
                try {
                    await apiRequest(`/feed/api/posts/${currentPostId}`, 'DELETE');
                    const postElement = document.querySelector(`.post[data-post-id="${currentPostId}"]`);
                    if (postElement) {
                        postElement.remove();
                        if (window.currentUserData && parseInt(postElement.dataset.userId) === window.currentUserData.id && userPostCountElement) {
                             const currentCount = parseInt(userPostCountElement.textContent || "0");
                             if (currentCount > 0) userPostCountElement.textContent = currentCount - 1;
                        }
                    }
                } catch (error) {
                    console.error("Erro ao excluir post:", error);
                }
            }
        } else if (target.classList.contains('delete-comment-button')) {
            const commentId = target.dataset.commentId;
            const parentPostId = target.dataset.postId;
            if (!commentId || !parentPostId) return;

            if (confirm("Tem certeza que deseja excluir este comentário?")) {
                try {
                    const response = await apiRequest(`/feed/api/posts/${parentPostId}/comments/${commentId}`, 'DELETE');
                    const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
                    if (commentElement) {
                        commentElement.remove();
                    }
                    const postElement = document.querySelector(`.post[data-post-id="${parentPostId}"]`);
                    if (postElement) {
                        const commentCountDisplay = postElement.querySelector('.comment-count-display');
                        if (commentCountDisplay && response.comment_count !== undefined) {
                            commentCountDisplay.textContent = `${response.comment_count || 0} comentário${response.comment_count !== 1 ? 's' : ''}`;
                        }
                    }
                } catch (error) {
                    console.error("Erro ao excluir comentário:", error);
                }
            }
        } else if (target.classList.contains('like-button')) {
            if (!postId) return;
            try {
                const response = await apiRequest(`/feed/api/posts/${postId}/like`, 'POST');
                const likeButton = target;
                const likeIcon = likeButton.querySelector('i');
                const likeText = likeButton.querySelector('.like-text');
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
            if (!postId) return;
            const commentsSection = document.getElementById(`comments-section-${postId}`);
            const commentsListDiv = document.getElementById(`comments-list-${postId}`);
            if (commentsSection) {
                const isVisible = commentsSection.style.display === 'block';
                commentsSection.style.display = isVisible ? 'none' : 'block';
                if (!isVisible && commentsListDiv) {
                    const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
                    const parentPostForComments = {
                        user_id: parseInt(postElement.dataset.userId),
                        id: parseInt(postId)
                    };
                    await loadAndDisplayComments(postId, commentsListDiv, parentPostForComments);
                }
            }
        } else if (target.classList.contains('share-button')) {
            if (!postId) return;
            const postUrl = `${window.location.origin}/feed#post-${postId}`;
            try {
                await navigator.clipboard.writeText(`Confira este post: ${postUrl}`);
                showCustomAlert("Link do post copiado para a área de transferência!", 'success');
            } catch (err) {
                showCustomAlert("Não foi possível copiar o link. Você pode copiar manualmente: " + postUrl, 'info');
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
            showCustomAlert("O comentário não pode estar vazio.", 'error');
            return;
        }

        try {
            const response = await apiRequest(`/feed/api/posts/${postId}/comments`, 'POST', { content });
            if (response.comment) {
                const commentsListDiv = document.getElementById(`comments-list-${postId}`);
                if (commentsListDiv) {
                    const noCommentsP = commentsListDiv.querySelector('.no-comments');
                    if (noCommentsP) noCommentsP.remove();
                    const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
                    const parentPostForNewComment = {
                        user_id: parseInt(postElement.dataset.userId),
                        id: parseInt(postId)
                    };
                    commentsListDiv.appendChild(renderComment(response.comment, parentPostForNewComment));
                }
                commentInput.value = '';

                const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
                const commentCountDisplay = postElement ? postElement.querySelector('.comment-count-display') : null;
                if (commentCountDisplay && response.comment_count !== undefined) {
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

    const loadPosts = async (filter = 'all', searchQuery = null) => {
        if (!postsContainer || !postPlaceholder) return;
        postPlaceholder.style.display = 'none';

        try {
            let endpoint = '/feed/api/posts?';
            const params = new URLSearchParams();
            if (filter !== 'all') {
                params.append('filter', filter);
            }
            if (searchQuery) {
                params.append('query', searchQuery);
            }
            endpoint += params.toString();

            const data = await apiRequest(endpoint, 'GET');
            postsContainer.innerHTML = '';
            if (data.posts && data.posts.length > 0) {
                postPlaceholder.style.display = 'none';
                data.posts.forEach(post => {
                    postsContainer.appendChild(renderPost(post, window.currentUserData));
                });
                if (window.currentUserData && userPostCountElement && filter === 'all' && !searchQuery) {
                    const userActorId = window.currentUserData.id;
                    if (window.currentUserData.actor_type === 'artist') {
                        const userPosts = data.posts.filter(p => p.user_id === userActorId);
                        userPostCountElement.textContent = userPosts.length;
                    }
                }

            } else {
                postsContainer.appendChild(postPlaceholder);
                postPlaceholder.style.display = 'block';
                let message = 'Nenhuma publicação para exibir.';
                if (searchQuery) message = `Nenhuma publicação encontrada para "${searchQuery}".`;
                else if (filter !== 'all') message = 'Nenhuma publicação para exibir com este filtro.';
                postPlaceholder.innerHTML = `<p>${message}</p><p><i class="fas fa-stream fa-2x"></i></p>`;
                if (userPostCountElement && filter === 'all' && !searchQuery && window.currentUserData && window.currentUserData.actor_type === 'artist') {
                    userPostCountElement.textContent = '0';
                }
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
            if (!postContentInput || !postTypeInput) {
                console.error("Elementos do formulário de criação de post não encontrados para submissão.");
                return;
            }

            const content = postContentInput.value.trim();
            const mediaFile = postMediaInput ? postMediaInput.files[0] : null;
            const postType = postTypeInput.value;

            if (!content && !mediaFile) {
                showCustomAlert("A publicação deve ter conteúdo ou uma mídia.", 'error');
                return;
            }

            const formData = new FormData();
            formData.append('content', content);
            formData.append('post_type', postType);
            if (mediaFile) {
                formData.append('media', mediaFile);
            }

            try {
                const result = await apiRequest('/feed/api/posts', 'POST', formData, true);
                if (result.post) {
                    await loadPosts(currentFilter);
                    createPostForm.reset();
                    if (postMediaNameDisplay) postMediaNameDisplay.textContent = '';

                    const activePostModal = document.getElementById('postModal');
                    if (activePostModal && activePostModal.style.display === 'flex') {
                         activePostModal.style.display = 'none';
                    }

                    if (currentFilter === 'all' && userPostCountElement && window.currentUserData && result.post.user_id === window.currentUserData.id) {
                        if (window.currentUserData.actor_type === 'artist') {
                             userPostCountElement.textContent = parseInt(userPostCountElement.textContent || "0") + 1;
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao criar post:", error);
            }
        });

        if (postMediaInput && postMediaNameDisplay) {
            postMediaInput.addEventListener('change', () => {
                if (postMediaInput.files.length > 0) {
                    postMediaNameDisplay.textContent = postMediaInput.files[0].name;
                } else {
                    postMediaNameDisplay.textContent = '';
                }
            });
        }
    }

    if (highlightsContainer) {
        highlightsContainer.addEventListener('click', (e) => {
            const highlightItem = e.target.closest('.highlight');
            if (highlightItem && highlightItem.dataset.filter) {
                currentFilter = highlightItem.dataset.filter;
                document.querySelectorAll('.highlight').forEach(item => item.classList.remove('active-filter'));
                highlightItem.classList.add('active-filter');
                const userFeedSearchInput = document.getElementById('userFeedSearch');
                let searchTerm = null;
                if (userFeedSearchInput && userFeedSearchInput.value.trim() !== '') {
                    searchTerm = userFeedSearchInput.value.trim();
                }
                loadPosts(currentFilter, searchTerm);
            }
        });
    }

    const userFeedSearchInput = document.getElementById('userFeedSearch');
    if (userFeedSearchInput) {
        userFeedSearchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const searchTerm = userFeedSearchInput.value.trim();
                loadPosts(currentFilter, searchTerm);
            }
        });
        userFeedSearchInput.addEventListener('input', function() {
            if (userFeedSearchInput.value.trim() === "") {
                loadPosts(currentFilter, null);
            }
        });
    }

    try {
        const userDataResponse = await apiRequest('/feed/api/user', 'GET');
        if (userDataResponse.user) {
            window.currentUserData = userDataResponse.user;
            updateProfileUI(window.currentUserData);
        } else {
            updateProfileUI(null);
        }
    } catch (error) {
        updateProfileUI(null);
        if (error.message && (error.message.includes("Autenticação requerida") || error.message.includes("Usuário não encontrado"))) {
            window.location.href = '/login';
            return;
        }
    }

    await loadPosts(currentFilter);

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await apiRequest('/logout', 'POST');
                window.currentUserData = null;
                window.location.href = '/';
            } catch (error) {
                console.error("Erro ao fazer logout:", error)
            }
        });
    }

    document.addEventListener('profileUpdatedGlobal', async (event) => {
        if (event.detail && event.detail.user) {
            window.currentUserData = event.detail.user;
            updateProfileUI(window.currentUserData);
            await loadPosts(currentFilter);
        }
    });
});

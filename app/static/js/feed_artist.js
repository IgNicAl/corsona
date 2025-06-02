document.addEventListener('DOMContentLoaded', () => {
    const managePostsButton = document.getElementById('managePostsButton');
    const manageMyPostsModal = document.getElementById('manageMyPostsModal');
    const closeManageMyPostsModalButton = document.getElementById('closeManageMyPostsModalButton');
    const cancelManageMyPostsModalButton = document.getElementById('cancelManageMyPostsModalButton');
    const myPostsModalBodyContainer = document.getElementById('myPostsModalBodyContainer');
    const myPostsModalPlaceholder = document.getElementById('myPostsModalPlaceholder');

    const postModal = document.getElementById('postModal');
    const openPostModalButton = document.getElementById('openPostModalButton');
    const closePostModalButton = document.getElementById('closePostModalButton');
    const cancelPostModalButton = document.getElementById('cancelPostModalButton');

    const createPostForm = document.getElementById('createPost');
    const postContentInput = document.getElementById('postContent');
    const postMediaInput = document.getElementById('postMedia');
    const postMediaNameDisplay = document.getElementById('postMediaName');
    const postTypeInput = document.getElementById('postType');
    const postModalTitle = postModal ? postModal.querySelector('.modal-header h2') : null;
    const postModalSubmitButton = postModal ? postModal.querySelector('button[type="submit"]') : null;

    const userPostCountElement = document.getElementById('userPostCount');
    let allPostsDataCache = [];

    const formatTimeAgoInternal = (isoString) => {
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

    const renderMediaElementInternal = (mediaPath, mediaType) => {
        if (!mediaPath) return '';
        const fullMediaPath = mediaPath.startsWith('http') || mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
        if (mediaType === 'image') {
            return `<div class="publication-media image"><img src="${fullMediaPath}" alt="Imagem da Publicação" loading="lazy"></div>`;
        } else if (mediaType === 'video') {
            return `<div class="publication-media video"><video controls src="${fullMediaPath}" loading="lazy"></video></div>`;
        } else if (mediaType === 'audio') {
            return `<div class="publication-media audio"><audio controls src="${fullMediaPath}" loading="lazy"></audio></div>`;
        }
        return '';
    };

    const renderPostTypeIconInternal = (postType) => {
        if (postType === 'event') {
            return '<i class="fas fa-calendar-alt post-type-icon" title="Evento"></i>';
        }
        return '';
    };

    const renderCommentForModal = (comment, parentPost) => {
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
                    <button class="delete-comment-button-modal" data-post-id="${parentPost.id}" data-comment-id="${comment.id}" title="Excluir Comentário">
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
                <span class="comment-time">${formatTimeAgoInternal(comment.created_at)}</span>
            </div>
        `;
        return commentDiv;
    };

    const loadAndDisplayCommentsForModal = async (postId, commentsListDiv, parentPostElement) => {
        try {
            const data = await apiRequest(`/feed/api/posts/${postId}/comments`, 'GET');
            commentsListDiv.innerHTML = '';
            const parentPostData = { // Construct parentPostData needed for renderCommentForModal
                user_id: parseInt(parentPostElement.dataset.userId),
                id: parseInt(postId)
            };
            if (data.comments && data.comments.length > 0) {
                data.comments.forEach(comment => {
                    commentsListDiv.appendChild(renderCommentForModal(comment, parentPostData));
                });
            } else {
                commentsListDiv.innerHTML = '<p class="no-comments">Nenhum comentário ainda.</p>';
            }
        } catch (error) {
            commentsListDiv.innerHTML = '<p class="no-comments">Erro ao carregar comentários.</p>';
        }
    };

    function renderPostForManagementModal(post, currentUser) {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post', 'post-in-modal');
        postDiv.dataset.postId = post.id;
        postDiv.dataset.postType = post.post_type;
        postDiv.dataset.mediaType = post.media_type || 'none';
        postDiv.dataset.userId = post.user_id;

        const defaultUserAvatar = '/static/images/logos/avatar-default.svg';
        const userAvatar = post.user_avatar_path || defaultUserAvatar;
        const mediaHTML = renderMediaElementInternal(post.media_path, post.media_type);
        const postTypeIconHTML = renderPostTypeIconInternal(post.post_type);

        const likedClass = post.liked_by_current_user ? 'liked' : '';
        const likeIconClass = post.liked_by_current_user ? 'fas' : 'far';

        let managementActionsHTML = '';
        if (currentUser && currentUser.actor_type === 'artist' && currentUser.id === post.user_id) {
            managementActionsHTML = `
                <button class="button edit-my-post-button" data-post-id="${post.id}" title="Editar Post">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="button delete-my-post-button" data-post-id="${post.id}" title="Excluir Post">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            `;
        }

        postDiv.innerHTML = `
            <div class="post-header">
                <div class="avatar"><img src="${userAvatar}" alt="Avatar de ${post.user_name || post.username}" loading="lazy"></div>
                <div class="post-author-info">
                    <h3 class="artist-name">${post.user_name || post.username}</h3>
                    <p class="time-ago" title="${new Date(post.created_at).toLocaleString()}">${formatTimeAgoInternal(post.created_at)}</p>
                </div>
                <div class="post-manage-actions-modal"> ${managementActionsHTML} </div>
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
                <button class="like-button ${likedClass}" data-post-id="${post.id}" title="Curtir">
                    <i class="${likeIconClass} fa-heart"></i> <span class="like-text">Curtir</span>
                </button>
                <button class="comment-button" data-post-id="${post.id}" title="Comentar">
                    <i class="far fa-comment"></i> Comentar
                </button>
                <button class="share-button" data-post-id="${post.id}" title="Compartilhar">
                    <i class="far fa-paper-plane"></i> Compartilhar
                </button>
            </div>
            <div class="comments-section" style="display: none;">
                <div class="comments-list"></div>
                <form class="add-comment-form-modal" data-post-id="${post.id}">
                    <input type="text" class="comment-input-modal" placeholder="Adicione um comentário..." required>
                    <button type="submit" class="submit-comment-button-modal">Enviar</button>
                </form>
            </div>
        `;
        return postDiv;
    }

    async function loadArtistPostsIntoModal() {
        if (!myPostsModalBodyContainer || !myPostsModalPlaceholder || !window.currentUserData || window.currentUserData.actor_type !== 'artist') {
            if(myPostsModalPlaceholder) myPostsModalPlaceholder.style.display = 'block';
            return;
        }
        myPostsModalBodyContainer.innerHTML = '';
        myPostsModalPlaceholder.style.display = 'none';

        try {
            const data = await apiRequest('/feed/api/posts', 'GET');
            allPostsDataCache = data.posts;
            const artistId = window.currentUserData.id;
            const artistPosts = allPostsDataCache.filter(p => p.user_id === artistId && p.actor_type === 'artist');

            if (artistPosts.length > 0) {
                artistPosts.forEach(post => {
                    myPostsModalBodyContainer.appendChild(renderPostForManagementModal(post, window.currentUserData));
                });
            } else {
                myPostsModalPlaceholder.style.display = 'block';
                myPostsModalPlaceholder.innerHTML = '<p>Você ainda não fez nenhuma publicação.</p>';
            }
        } catch (error) {
            myPostsModalPlaceholder.innerHTML = '<p>Erro ao carregar suas publicações. Tente novamente.</p>';
            myPostsModalPlaceholder.style.display = 'block';
        }
    }

    function openManageMyPostsModal() {
        if (manageMyPostsModal) {
            manageMyPostsModal.style.display = 'flex';
            loadArtistPostsIntoModal();
        }
    }

    function closeManageMyPostsModal() {
        if (manageMyPostsModal) {
            manageMyPostsModal.style.display = 'none';
            if(myPostsModalBodyContainer) myPostsModalBodyContainer.innerHTML = '';
        }
    }

    function openEditPostModal(postId) {
        const postData = allPostsDataCache.find(p => p.id === parseInt(postId));
        if (!postData) {
            showCustomAlert("Não foi possível encontrar os dados do post para edição.", "error");
            return;
        }
        closeManageMyPostsModal();
        if (createPostForm && postContentInput && postTypeInput && postMediaNameDisplay && postModalTitle && postModalSubmitButton) {
            createPostForm.dataset.editMode = 'true';
            createPostForm.dataset.postId = postData.id;
            postModalTitle.textContent = 'Editar Publicação';
            postModalSubmitButton.textContent = 'Salvar Alterações';
            postContentInput.value = postData.content || '';
            postTypeInput.value = postData.post_type || 'publication';
            if (postData.media_path) {
                postMediaNameDisplay.textContent = `Mídia atual: ${postData.media_path.split('/').pop()}. Selecione um novo arquivo para alterar.`;
            } else {
                postMediaNameDisplay.textContent = 'Nenhuma mídia. Adicione uma se desejar.';
            }
            postMediaInput.value = '';
            if (postModal) postModal.style.display = 'flex';
        } else {
            showCustomAlert("Erro ao preparar o formulário de edição.", "error");
        }
    }

    if (managePostsButton) {
        managePostsButton.addEventListener('click', () => {
            if (window.currentUserData && window.currentUserData.actor_type === 'artist') {
                openManageMyPostsModal();
            } else {
                showCustomAlert("Funcionalidade disponível apenas para artistas logados.", 'error');
            }
        });
    }

    if (closeManageMyPostsModalButton) closeManageMyPostsModalButton.addEventListener('click', closeManageMyPostsModal);
    if (cancelManageMyPostsModalButton) cancelManageMyPostsModalButton.addEventListener('click', closeManageMyPostsModal);

    if (manageMyPostsModal) {
        manageMyPostsModal.addEventListener('click', (event) => {
            if (event.target === manageMyPostsModal) closeManageMyPostsModal();
        });
    }

    if (myPostsModalBodyContainer) {
        myPostsModalBodyContainer.addEventListener('click', async (event) => {
            const targetButton = event.target.closest('button');
            if (!targetButton) return;

            const postElementInModal = targetButton.closest('.post-in-modal');
            if (!postElementInModal) return;
            const postId = postElementInModal.dataset.postId;

            if (!postId) return;

            if (targetButton.classList.contains('delete-my-post-button')) {
                if (confirm("Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.")) {
                    try {
                        await apiRequest(`/feed/api/posts/${postId}`, 'DELETE');
                        postElementInModal.remove();
                        const postInFeed = document.querySelector(`.post[data-post-id="${postId}"]`);
                        if (postInFeed) postInFeed.remove();
                        if (userPostCountElement && window.currentUserData && window.currentUserData.actor_type === 'artist') {
                            const currentCount = parseInt(userPostCountElement.textContent || "0");
                            if (currentCount > 0) userPostCountElement.textContent = currentCount - 1;
                        }
                        showCustomAlert("Publicação excluída com sucesso.", "success");
                        const remainingPosts = myPostsModalBodyContainer.querySelectorAll('.post-in-modal');
                        if (remainingPosts.length === 0 && myPostsModalPlaceholder) {
                            myPostsModalPlaceholder.innerHTML = '<p>Você não tem mais publicações para gerenciar aqui.</p>';
                            myPostsModalPlaceholder.style.display = 'block';
                        }
                    } catch (error) {
                        showCustomAlert("Erro ao excluir a publicação.", "error");
                    }
                }
            } else if (targetButton.classList.contains('edit-my-post-button')) {
                openEditPostModal(postId);
            } else if (targetButton.classList.contains('like-button')) {
                try {
                    const response = await apiRequest(`/feed/api/posts/${postId}/like`, 'POST');
                    const likeIcon = targetButton.querySelector('i');
                    const likeText = targetButton.querySelector('.like-text');
                    const likeCountDisplay = postElementInModal.querySelector('.like-count-display');
                    if (response.liked) {
                        targetButton.classList.add('liked');
                        likeIcon.classList.remove('far');
                        likeIcon.classList.add('fas');
                        if (likeText) likeText.textContent = 'Curtiu';
                    } else {
                        targetButton.classList.remove('liked');
                        likeIcon.classList.remove('fas');
                        likeIcon.classList.add('far');
                        if (likeText) likeText.textContent = 'Curtir';
                    }
                    if (likeCountDisplay) {
                        likeCountDisplay.textContent = `${response.like_count || 0} curtida${response.like_count !== 1 ? 's' : ''}`;
                    }
                } catch (error) {
                    showCustomAlert("Erro ao processar curtida.", "error");
                }
            } else if (targetButton.classList.contains('comment-button')) {
                const commentsSection = postElementInModal.querySelector('.comments-section');
                const commentsListDiv = postElementInModal.querySelector('.comments-list');
                if (commentsSection && commentsListDiv) {
                    const isVisible = commentsSection.style.display === 'block';
                    commentsSection.style.display = isVisible ? 'none' : 'block';
                    if (!isVisible) {
                        await loadAndDisplayCommentsForModal(postId, commentsListDiv, postElementInModal);
                    }
                }
            } else if (targetButton.classList.contains('share-button')) {
                const postUrl = `${window.location.origin}/feed#post-${postId}`;
                try {
                    await navigator.clipboard.writeText(`Confira este post: ${postUrl}`);
                    showCustomAlert("Link do post copiado para a área de transferência!", 'success');
                } catch (err) {
                    showCustomAlert("Não foi possível copiar o link. Você pode copiar manualmente: " + postUrl, 'info');
                }
            } else if (targetButton.classList.contains('delete-comment-button-modal')) {
                const commentId = targetButton.dataset.commentId;
                if (confirm("Tem certeza que deseja excluir este comentário?")) {
                    try {
                        const response = await apiRequest(`/feed/api/posts/${postId}/comments/${commentId}`, 'DELETE');
                        const commentElement = targetButton.closest('.comment');
                        if (commentElement) commentElement.remove();

                        const commentCountDisplay = postElementInModal.querySelector('.comment-count-display');
                        if (commentCountDisplay && response.comment_count !== undefined) {
                            commentCountDisplay.textContent = `${response.comment_count || 0} comentário${response.comment_count !== 1 ? 's' : ''}`;
                        }
                         const commentsListDiv = postElementInModal.querySelector('.comments-list');
                         if (commentsListDiv && commentsListDiv.children.length === 0 && response.comment_count === 0) {
                            commentsListDiv.innerHTML = '<p class="no-comments">Nenhum comentário ainda.</p>';
                         }

                    } catch (error) {
                        showCustomAlert("Erro ao excluir comentário.", "error");
                    }
                }
            }
        });

        myPostsModalBodyContainer.addEventListener('submit', async (event) => {
            if (event.target.classList.contains('add-comment-form-modal')) {
                event.preventDefault();
                const form = event.target;
                const postId = form.dataset.postId;
                const commentInput = form.querySelector('.comment-input-modal');
                const content = commentInput.value.trim();
                const postElementInModal = form.closest('.post-in-modal');

                if (!content) {
                    showCustomAlert("O comentário não pode estar vazio.", 'error');
                    return;
                }
                try {
                    const response = await apiRequest(`/feed/api/posts/${postId}/comments`, 'POST', { content });
                    if (response.comment && postElementInModal) {
                        const commentsListDiv = postElementInModal.querySelector('.comments-list');
                        if (commentsListDiv) {
                            const noCommentsP = commentsListDiv.querySelector('.no-comments');
                            if (noCommentsP) noCommentsP.remove();
                            const parentPostData = {
                                user_id: parseInt(postElementInModal.dataset.userId),
                                id: parseInt(postId)
                            };
                            commentsListDiv.appendChild(renderCommentForModal(response.comment, parentPostData));
                        }
                        commentInput.value = '';
                        const commentCountDisplay = postElementInModal.querySelector('.comment-count-display');
                        if (commentCountDisplay && response.comment_count !== undefined) {
                            commentCountDisplay.textContent = `${response.comment_count || 0} comentário${response.comment_count !== 1 ? 's' : ''}`;
                        }
                    }
                } catch (error) {
                    showCustomAlert("Erro ao adicionar comentário.", "error");
                }
            }
        });
    }

    const openPostCreationModal = () => {
        if (createPostForm && postModalTitle && postModalSubmitButton && postModal) {
            createPostForm.removeAttribute('data-edit-mode');
            createPostForm.removeAttribute('data-post-id');
            postModalTitle.textContent = 'Nova Publicação';
            postModalSubmitButton.textContent = 'Publicar';
            createPostForm.reset();
            if(postMediaNameDisplay) postMediaNameDisplay.textContent = '';
            postModal.style.display = 'flex';
        }
    };

    const closePostCreationModal = () => {
        if (postModal) {
            postModal.style.display = 'none';
            if (createPostForm) {
                createPostForm.reset();
                createPostForm.removeAttribute('data-edit-mode');
                createPostForm.removeAttribute('data-post-id');
            }
            if (postMediaNameDisplay) postMediaNameDisplay.textContent = '';
            if (postModalTitle) postModalTitle.textContent = 'Nova Publicação';
            if (postModalSubmitButton) postModalSubmitButton.textContent = 'Publicar';
        }
    };

    if (openPostModalButton) openPostModalButton.addEventListener('click', openPostCreationModal);
    if (closePostModalButton) closePostModalButton.addEventListener('click', closePostCreationModal);
    if (cancelPostModalButton) cancelPostModalButton.addEventListener('click', closePostCreationModal);

    if (postModal) {
        postModal.addEventListener('click', (event) => {
            if (event.target === postModal) closePostCreationModal();
        });
    }
});

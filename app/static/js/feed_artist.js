document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript específico do feed do artista carregado.");

    const manageMyPostsButton = document.getElementById('manageMyPostsButton');
    if (manageMyPostsButton) {
        manageMyPostsButton.addEventListener('click', () => {
            if(window.currentUserData && window.currentUserData.actor_type === 'artist'){
              const artistId = window.currentUserData.id;
              const postsOnPage = document.querySelectorAll('.post');
              let foundPosts = 0;
              postsOnPage.forEach(postElement => {
                if (postElement.dataset.userId && parseInt(postElement.dataset.userId) === artistId) {
                  postElement.style.border = '2px solid var(--primary-color)';
                  foundPosts++;
                } else {
                  postElement.style.border = '1px solid #dee2e6';
                }
              });
              if (foundPosts > 0) {
                showCustomAlert("Suas publicações foram destacadas. Use o menu em cada post para gerenciar.", 'info');
              } else {
                showCustomAlert("Você não tem publicações visíveis nessa página para destacar.", 'info');
              }
            } else {
              showCustomAlert("Funcionalidade disponível apenas para artistas logados.", 'error');
            }
        });
    }

    const createPostFormArtistPage = document.getElementById('createPostForm');
    if (createPostFormArtistPage) {
        createPostFormArtistPage.addEventListener('submit', function(event) {
            const postContent = document.getElementById('postContent')?.value.trim();
            const postMedia = document.getElementById('postMedia')?.files[0];
            if (!postContent && !postMedia) {
                console.warn("Artista tentando enviar uma publicação vazia (verificação em feed_artist.js).");
            }
        });
    }

    const createPostModal = document.getElementById('createPostModal');
    const openCreatePostModalButton = document.getElementById('openCreatePostModalButton');
    const closeCreatePostModalButton = document.getElementById('closeCreatePostModalButton');
    const cancelCreatePostModalButton = document.getElementById('cancelCreatePostModalButton');

    const formInsideModal = document.getElementById('createPostForm');
    const postMediaNameDisplayInModal = document.getElementById('postMediaName');

    const openModal = () => {
        if (createPostModal) {
            createPostModal.style.display = 'flex';
        }
    };

    const closeModal = () => {
        if (createPostModal) {
            createPostModal.style.display = 'none';
            if (formInsideModal) {
                formInsideModal.reset();
            }
            if (postMediaNameDisplayInModal) {
                postMediaNameDisplayInModal.textContent = '';
            }
        }
    };

    if (openCreatePostModalButton) {
        openCreatePostModalButton.addEventListener('click', openModal);
    }

    if (closeCreatePostModalButton) {
        closeCreatePostModalButton.addEventListener('click', closeModal);
    }

    if (cancelCreatePostModalButton) {
        cancelCreatePostModalButton.addEventListener('click', closeModal);
    }

    if (createPostModal) {
        createPostModal.addEventListener('click', (event) => {
            if (event.target === createPostModal) {
                closeModal();
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript específico do feed do artista carregado.");

    const managePosts = document.getElementById('managePosts');
    if (managePosts) {
        managePosts.addEventListener('click', () => {
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

    const postModal = document.getElementById('postModal');
    const openPostModalButton = document.getElementById('openPostModalButton');
    const closePostModalButton = document.getElementById('closePostModalButton');
    const cancelPostModalButton = document.getElementById('cancelPostModalButton');

    const formInsideModal = document.getElementById('createPostForm');
    const postMediaNameDisplayInModal = document.getElementById('postMediaName');

    const openModal = () => {
        if (postModal) {
            postModal.style.display = 'flex';
        }
    };

    const closeModal = () => {
        if (postModal) {
            postModal.style.display = 'none';
            if (formInsideModal) {
                formInsideModal.reset();
            }
            if (postMediaNameDisplayInModal) {
                postMediaNameDisplayInModal.textContent = '';
            }
        }
    };

    if (openPostModalButton) {
        openPostModalButton.addEventListener('click', openModal);
    }

    if (closePostModalButton) {
        closePostModalButton.addEventListener('click', closeModal);
    }

    if (cancelPostModalButton) {
        cancelPostModalButton.addEventListener('click', closeModal);
    }

    if (postModal) {
        postModal.addEventListener('click', (event) => {
            if (event.target === postModal) {
                closeModal();
            }
        });
    }
});

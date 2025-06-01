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
                alert("Suas publicações foram destacadas. Use o menu em cada post para gerenciar.");
              } else {
                alert("Você não tem publicações visíveis nessa págia para destacar.");
              }
            } else {
              alert("Funcionalidade disponível apenas para artistas logados.");
            }
        });
    }

    const createPostFormArtist = document.getElementById('createPostForm');
    if (createPostFormArtist) {
        createPostFormArtist.addEventListener('submit', function(event) {
            const postContent = document.getElementById('postContent')?.value.trim();
            const postMedia = document.getElementById('postMedia')?.files.length > 0;
            if (!postContent && !postMedia) {
                console.warn("Artista tentando enviar uma publicação vazia.");
            }
        });
    }
});

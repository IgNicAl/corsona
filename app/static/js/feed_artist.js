document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript específico do feed do artista carregado.");

    const manageMyPostsButton = document.getElementById('manageMyPostsButton');
    if (manageMyPostsButton) {
        manageMyPostsButton.addEventListener('click', () => {
            alert("Funcionalidade 'Gerenciar Minhas Publicações' ainda não implementada. Redirecionamento ou modal apareceria aqui.");
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

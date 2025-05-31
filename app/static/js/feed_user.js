document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript específico do feed do usuário carregado.");

    const userFeedSearch = document.getElementById('userFeedSearch');
    if (userFeedSearch) {
        userFeedSearch.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const searchTerm = userFeedSearch.value.trim();
                if (searchTerm) {
                    console.log(`Usuário iniciou busca por: ${searchTerm}`);
                    alert(`Funcionalidade de busca por "${searchTerm}" ainda não implementada. Mas o evento foi capturado!`);
                }
            }
        });
    }
});

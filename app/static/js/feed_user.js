document.addEventListener('DOMContentLoaded', () => {
  console.log("JavaScript específico do feed do usuário carregado.");

  const userFeedSearchInput = document.getElementById('userFeedSearch');
  if(userFeedSearchInput) {
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
    })
  }
})

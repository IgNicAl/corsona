let currentAlertTimeout = null;

function showCustomAlert(message, type = 'info', duration = 5000) {
    console.log(`[NOTIF] Tentando mostrar: "${message}", tipo: ${type}, duração: ${duration}`);
    const alertContainer = document.getElementById('custom-alert-container');
    const alertMessage = document.getElementById('custom-alert-message');
    const alertCloseBtn = document.getElementById('custom-alert-close-btn');

    if (!alertContainer || !alertMessage || !alertCloseBtn) {
        console.error('[NOTIF] Elementos do alerta customizado não encontrados no DOM. Usando alert padrão.');
        alert(`(${type.toUpperCase()}) ${message}`);
        return;
    }

    if (currentAlertTimeout) {
        console.log(`[NOTIF] Limpando timeout anterior: ${currentAlertTimeout}`);
        clearTimeout(currentAlertTimeout);
    }

    alertMessage.textContent = message;
    alertContainer.className = 'custom-alert'; // Reseta classes de tipo e 'show'
    alertContainer.classList.add(type);

    // Força reflow para reiniciar a animação se o alerta for chamado em rápida sucessão
    alertContainer.classList.remove('show');
    void alertContainer.offsetWidth; // Trigger reflow
    alertContainer.classList.add('show');
    console.log(`[NOTIF] Alerta "${message}" deve estar visível agora (classe 'show' adicionada).`);

    currentAlertTimeout = setTimeout(() => {
        console.log(`[NOTIF] Timeout: Escondendo alerta "${message}"`);
        hideCustomAlert(message); // Passa a mensagem para o log de hide
    }, duration);

    alertCloseBtn.onclick = function() {
        console.log(`[NOTIF] Botão Fechar clicado: Escondendo alerta "${message}"`);
        clearTimeout(currentAlertTimeout);
        hideCustomAlert(message); // Passa a mensagem para o log de hide
    };
}

function hideCustomAlert(originalMessageForLog = "N/A") {
    const alertContainer = document.getElementById('custom-alert-container');
    if (alertContainer) {
        if (alertContainer.classList.contains('show')) {
            console.log(`[NOTIF] Escondendo: "${originalMessageForLog}" (estava visível, removendo classe 'show')`);
            alertContainer.classList.remove('show');
        } else {
            console.log(`[NOTIF] Chamada para esconder: "${originalMessageForLog}", mas não estava visível (sem classe 'show').`);
        }
    } else {
        console.log(`[NOTIF] Chamada para esconder: "${originalMessageForLog}", mas o container do alerta não foi encontrado.`);
    }
    currentAlertTimeout = null;
}

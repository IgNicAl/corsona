async function apiRequest(endpoint, method = 'POST', body = null, isFormData = false) {
    const headers = {};
    let fetchBody = body;

    if (!isFormData && body) {
        headers['Content-Type'] = 'application/json';
        fetchBody = JSON.stringify(body);
    }

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: headers,
            body: fetchBody
        });

        const responseData = await response.json();

        if (!response.ok) {
            showCustomAlert(responseData.message || `Erro HTTP: ${response.status}`, 'error');
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        if (responseData.message && (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH' || response.status === 200 || response.status === 201)) {
            let alertType = 'success';
            if (response.status === 401 && responseData.message.toLowerCase().includes("autenticação requerida")){
            } else {
                showCustomAlert(responseData.message, alertType);
            }
        }
        return responseData;

    } catch (error) {
        console.error('API Request Error:', error.message, 'Endpoint:', endpoint);
        const alertContainer = document.getElementById('custom-alert-container');
        if (!error.message.startsWith('HTTP error!') && !(alertContainer && alertContainer.classList.contains('show'))) {
             showCustomAlert('Ocorreu um erro de comunicação. Verifique sua conexão ou tente novamente.', 'error');
        }
        throw error;
    }
}

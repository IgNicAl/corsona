async function apiRequest(endpoint, method = 'POST', body = null, isFormData = false) {
    const headers = {};
    let fetchBody = body;

    if (!isFormData && body) {
        headers['Content-Type'] = 'application/json';
        fetchBody = JSON.stringify(body);
    } else if (isFormData) {
    }


    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: headers,
            body: fetchBody
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error('API Request Error:', error.message, 'Endpoint:', endpoint);
        let userMessage = 'Ocorreu um erro na comunicação com o servidor. Tente novamente mais tarde.';
        if (error.message && !error.message.startsWith('HTTP error')) {
            userMessage = error.message;
        }
        alert(userMessage);
        throw error;
    }
}

/**
 * client-side Gemini AI communication
 */

const GEMINI_API_BASE = window.CONFIG.API_BASE_URL + '/api/gemini/chat';

async function askGemini(prompt, history = [], options = {}) {
    try {
        const credentialsOption = options.credentials || 'include';
        const response = await fetch(GEMINI_API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: credentialsOption,
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                text: data.text || data.generated_text
            };
        } else {
            return {
                success: false,
                error: data.error || 'Failed to fetch Gemini response',
                details: data.details || null
            };
        }
    } catch (error) {
        console.error('Gemini Fetch Error:', error);
        return {
            success: false,
            error: 'Could not connect to AI server.',
            details: error.message
        };
    }
}

window.askGemini = askGemini;

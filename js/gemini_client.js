/**
 * client-side Gemini AI communication
 */

const GEMINI_API_KEY = window.CONFIG.API_BASE_URL + '/api/gemini/chat';

async function askGemini(prompt, history = []) {
    try {
        const response = await fetch(GEMINI_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt, history })
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
                error: data.error || 'Failed to fetch Gemini response'
            };
        }
    } catch (error) {
        console.error('Gemini Fetch Error:', error);
        return {
            success: false,
            error: 'Could not connect to AI server.'
        };
    }
}

window.askGemini = askGemini;

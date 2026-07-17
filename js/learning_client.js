document.addEventListener('DOMContentLoaded', () => {
    const tabStandard = document.getElementById('tab-standard');
    const tabAi = document.getElementById('tab-ai');
    const tabQuantum = document.getElementById('tab-quantum');

    const standardView = document.getElementById('standard-search-view');
    const aiView = document.getElementById('ai-search-view');
    const quantumView = document.getElementById('quantum-view');

    const aiInput = document.getElementById('aiInput');
    const aiResultsContainer = document.getElementById('aiResultsContainer');

    const quantumInput = document.getElementById('quantumInput');
    const quantumUrlInput = document.getElementById('quantumUrlInput');
    const quantumResultsContainer = document.getElementById('quantumResultsContainer');
    const askGeminiAiBtn = document.getElementById('askGeminiAiBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const quantumAnalyzeBtn = document.getElementById('quantumAnalyzeBtn');

    const API_BASE = window.CONFIG.API_BASE_URL + '/api/learning';
    let geminiChatHistory = [];

    // Tab Switching
    function switchTab(tabName) {
        // Reset all
        [tabStandard, tabAi, tabQuantum].forEach(t => t.classList.remove('active'));
        [standardView, aiView, quantumView].forEach(v => v.style.display = 'none');

        if (tabName === 'standard') {
            tabStandard.classList.add('active');
            standardView.style.display = 'block';
        } else if (tabName === 'ai') {
            tabAi.classList.add('active');
            aiView.style.display = 'block';
            aiInput.focus();
        } else if (tabName === 'quantum') {
            tabQuantum.classList.add('active');
            quantumView.style.display = 'block';
            quantumUrlInput.focus();
        }
    }

    tabStandard.addEventListener('click', () => switchTab('standard'));
    tabAi.addEventListener('click', () => switchTab('ai'));
    tabQuantum.addEventListener('click', () => switchTab('quantum'));

    // Shared Search Function
    async function performSearch(query, category, container) {
        if (!query) return;

        container.innerHTML = '<div class="loading-spinner"></div><p style="text-align:center; color:#666;">Thinking...</p>';

        try {
            const response = await fetch(`${API_BASE}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, category }) // Send category
            });

            const data = await response.json();

            if (response.ok) {
                renderAIResponse(data, container);
            } else {
                container.innerHTML = `<p style="color:red; text-align:center;">Error: ${data.error}</p>`;
            }

        } catch (err) {
            console.error(err);
            container.innerHTML = `<p style="color:red; text-align:center;">Failed to connect to AI server. Ensure backend is running.</p>`;
        }
    }

    // AI Search Logic (Project)
    // Removed Enter key listener as per user request (Ask Gemini button is used instead)

    // Quantum Search Logic
    // Removed Enter key listener as per user request (Ask Gemini button is used instead)

    // Gemini Integration Logic
    async function handleGeminiChat(inputElement, container) {
        const query = inputElement.value.trim();
        if (!query) {
            alert("Please enter a question.");
            return;
        }

        // Clear the input field immediately to give a responsive feel
        inputElement.value = '';

        // If it's the first message, create a styled messages container with max-height and scrolling
        if (geminiChatHistory.length === 0) {
            container.innerHTML = `
                <div class="chat-messages-container" style="display:flex; flex-direction:column; gap:15px; text-align:left; max-height:450px; overflow-y:auto; padding:15px; background: rgba(255, 255, 255, 0.4); border-radius: 15px; border: 1px solid rgba(155, 89, 182, 0.15); margin-bottom: 20px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);">
                </div>
            `;
            if (clearChatBtn) {
                clearChatBtn.style.display = 'inline-block';
            }
        }

        const messagesContainer = container.querySelector('.chat-messages-container') || container;

        // Append User Message to UI
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'chat-message user-msg';
        userMsgDiv.style.alignSelf = 'flex-end';
        userMsgDiv.style.background = '#e1e5f2';
        userMsgDiv.style.padding = '12px 18px';
        userMsgDiv.style.borderRadius = '15px 15px 0 15px';
        userMsgDiv.style.maxWidth = '80%';
        userMsgDiv.style.margin = '5px 0';
        userMsgDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        userMsgDiv.innerHTML = `<strong>You:</strong> <p style="margin: 5px 0 0 0; white-space: pre-wrap; word-break: break-word;">${query}</p>`;
        messagesContainer.appendChild(userMsgDiv);

        // Append Loading Spinner to UI
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message loading-msg';
        loadingDiv.style.alignSelf = 'flex-start';
        loadingDiv.style.background = 'rgba(255, 255, 255, 0.8)';
        loadingDiv.style.padding = '12px 18px';
        loadingDiv.style.borderRadius = '15px 15px 15px 0';
        loadingDiv.style.maxWidth = '80%';
        loadingDiv.style.margin = '5px 0';
        loadingDiv.style.borderLeft = '4px solid #9b59b6';
        loadingDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        loadingDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; color:#9b59b6; font-size:0.95rem;">
                <div class="loading-spinner" style="margin: 0; width: 18px; height: 18px; border-width: 2px;"></div>
                <span>Gemini is thinking...</span>
            </div>`;
        messagesContainer.appendChild(loadingDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // Call askGemini with the new query and the history so far
            const result = await window.askGemini(query, geminiChatHistory);
            
            // Remove loading spinner
            loadingDiv.remove();

            if (result.success) {
                const responseText = result.text;
                
                // Append AI response to UI
                const aiMsgDiv = document.createElement('div');
                aiMsgDiv.className = 'chat-message ai-msg';
                aiMsgDiv.style.alignSelf = 'flex-start';
                aiMsgDiv.style.background = 'rgba(255, 255, 255, 0.95)';
                aiMsgDiv.style.borderLeft = '4px solid #9b59b6';
                aiMsgDiv.style.padding = '12px 18px';
                aiMsgDiv.style.borderRadius = '15px 15px 15px 0';
                aiMsgDiv.style.maxWidth = '80%';
                aiMsgDiv.style.margin = '5px 0';
                aiMsgDiv.style.boxShadow = '0 3px 10px rgba(0,0,0,0.05)';
                
                const formattedText = responseText
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/^#{1,3} (.+)$/gm, '<h4 style="margin: 12px 0 6px; color:#9b59b6;">$1</h4>')
                    .replace(/\n/g, '<br>');
                
                aiMsgDiv.innerHTML = `<strong>Gemini AI:</strong> <div style="margin: 5px 0 0 0; line-height:1.6; word-break: break-word;">${formattedText}</div>`;
                messagesContainer.appendChild(aiMsgDiv);

                // Update history
                geminiChatHistory.push({ role: 'user', parts: [{ text: query }] });
                geminiChatHistory.push({ role: 'model', parts: [{ text: responseText }] });
            } else {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'chat-message error-msg';
                errorDiv.style.alignSelf = 'center';
                errorDiv.style.background = '#fee2e2';
                errorDiv.style.color = '#ef4444';
                errorDiv.style.padding = '10px 15px';
                errorDiv.style.borderRadius = '10px';
                errorDiv.style.margin = '5px 0';
                errorDiv.innerHTML = `<strong>Gemini Error:</strong> ${result.error}`;
                messagesContainer.appendChild(errorDiv);
            }
        } catch (err) {
            console.error(err);
            loadingDiv.remove();
            const errorDiv = document.createElement('div');
            errorDiv.style.alignSelf = 'center';
            errorDiv.style.background = '#fee2e2';
            errorDiv.style.color = '#ef4444';
            errorDiv.style.padding = '10px 15px';
            errorDiv.style.borderRadius = '10px';
            errorDiv.style.margin = '5px 0';
            errorDiv.innerHTML = `<strong>Error:</strong> Failed to connect to Gemini.`;
            messagesContainer.appendChild(errorDiv);
        }

        // Scroll to bottom again
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    askGeminiAiBtn.addEventListener('click', () => {
        handleGeminiChat(aiInput, aiResultsContainer);
    });

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            geminiChatHistory = [];
            aiResultsContainer.innerHTML = '<p style="opacity: 0.6;">Ask anything. The AI has learned from the project files.</p>';
            clearChatBtn.style.display = 'none';
        });
    }

    aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleGeminiChat(aiInput, aiResultsContainer);
        }
    });

    // ─── Quantum Learning: URL + Question → Gemini ────────────────────────────
    async function handleQuantumAnalyze() {
        const url = quantumUrlInput.value.trim();
        const question = quantumInput.value.trim();

        if (!url) {
            showQuantumError('Please paste a URL to study.');
            return;
        }
        if (!question) {
            showQuantumError('Please enter a question about the resource.');
            return;
        }

        // Basic URL validation
        try { new URL(url); } catch (_) {
            showQuantumError('That doesn\'t look like a valid URL. Please include https://');
            return;
        }

        quantumResultsContainer.innerHTML = `
            <div class="loading-spinner"></div>
            <p style="text-align:center; color:#9b59b6; margin-top:10px;">
                ⚛️ Fetching resource and consulting AI...
            </p>`;

        // Disable button while loading
        quantumAnalyzeBtn.disabled = true;
        quantumAnalyzeBtn.textContent = 'Analyzing...';

        let pageText = '';
        let fetchSuccess = false;

        // Try Proxy 1: corsproxy.io (returns raw html/text directly)
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
                const text = await res.text();
                if (text && text.trim().length > 100) {
                    pageText = text;
                    fetchSuccess = true;
                }
            }
        } catch (e) {
            console.warn('Proxy 1 failed:', e);
        }

        // Try Proxy 2: allorigins (returns JSON wrapper) if Proxy 1 failed
        if (!fetchSuccess) {
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const data = await res.json();
                    const text = data.contents || '';
                    if (text && text.trim().length > 100) {
                        pageText = text;
                        fetchSuccess = true;
                    }
                }
            } catch (e) {
                console.warn('Proxy 2 failed:', e);
            }
        }

        try {
            let prompt = '';
            
            if (fetchSuccess) {
                // Strip HTML tags and condense whitespace
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = pageText;

                // Remove scripts & styles from parsed DOM
                tempDiv.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
                let cleanText = (tempDiv.textContent || tempDiv.innerText || '').replace(/\s+/g, ' ').trim();

                // Limit context length to avoid token overflows (~12,000 chars)
                const MAX_CHARS = 12000;
                if (cleanText.length > MAX_CHARS) {
                    cleanText = cleanText.substring(0, MAX_CHARS) + '\n\n[Content truncated for length]';
                }

                // Build prompt with fetched content
                prompt = `You are an expert tutor. A student has provided you with the following text extracted from the URL: ${url}

---BEGIN RESOURCE TEXT---
${cleanText}
---END RESOURCE TEXT---

Based ONLY on the above resource, answer the student's question in a clear, structured way.
If the resource does not contain relevant information, say so and provide your general knowledge.

Student's Question: ${question}`;
            } else {
                // Fallback: Inform Gemini that we couldn't fetch the page, but ask it to answer using its knowledge of the URL/topic.
                prompt = `You are an expert tutor. A student wanted to study this specific URL: ${url}
However, the URL content could not be directly fetched due to network restrictions.

Please answer the student's question by utilizing your knowledge/understanding of that specific URL's topic and contents (and general knowledge of quantum science if needed). Let the student know you are answering based on your knowledge of the resource/topic since direct fetching failed.

Student's Question: ${question}`;
            }

            const result = await window.askGemini(prompt);

            if (result.success) {
                renderQuantumResponse(result.text, url, question, !fetchSuccess);
            } else {
                showQuantumError(`Gemini Error: ${result.error}`);
            }

        } catch (err) {
            console.error('Quantum Analyze Error:', err);
            showQuantumError('An unexpected error occurred during analysis.');
        } finally {
            quantumAnalyzeBtn.disabled = false;
            quantumAnalyzeBtn.innerHTML = '<span class="btn-icon">⚛️</span> Analyze &amp; Answer';
        }
    }

    function showQuantumError(message) {
        quantumResultsContainer.innerHTML = `
            <div class="quantum-error-box">
                <span>⚠️</span> ${message}
            </div>`;
    }

    function renderQuantumResponse(text, sourceUrl, question, isFallback = false) {
        const formattedText = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^#{1,3} (.+)$/gm, '<h4 style="margin: 12px 0 6px; color:#7d3cba;">$1</h4>')
            .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul style="margin: 8px 0 8px 20px;">$1</ul>')
            .replace(/\n/g, '<br>');

        const fallbackDisclaimer = isFallback ? `
            <div style="background: rgba(243, 156, 18, 0.1); border-left: 4px solid #f39c12; padding: 12px 24px; font-size: 0.9rem; color: #d35400; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                <span>⚠️</span> Note: This site blocked direct scraping. AI generated this explanation using general knowledge of the requested resource.
            </div>
        ` : '';

        quantumResultsContainer.innerHTML = `
            <div class="quantum-response-card">
                <div class="quantum-response-header">
                    <span class="quantum-response-icon">⚛️</span>
                    <div>
                        <h3 class="quantum-response-title">AI Analysis</h3>
                        <p class="quantum-response-subtitle">Based on: <a href="${sourceUrl}" target="_blank" class="quantum-source-link">${sourceUrl}</a></p>
                    </div>
                </div>
                ${fallbackDisclaimer}
                <div class="quantum-question-badge">
                    <span>❓</span> ${question}
                </div>
                <div class="quantum-response-body">${formattedText}</div>
            </div>`;
    }

    quantumAnalyzeBtn.addEventListener('click', handleQuantumAnalyze);

    // Also allow Enter key on question input to trigger analysis
    quantumInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleQuantumAnalyze();
    });

    function renderGeminiResponse(text, container) {
        const formattedText = text.replace(/\n/g, '<br>');
        container.innerHTML = `
            <div class="ai-answer-box" style="border-left-color: #9b59b6;">
                <h3 style="margin-bottom:10px; color:#9b59b6;">Gemini AI (General Knowledge)</h3>
                <div class="gemini-response" style="line-height: 1.6;">${formattedText}</div>
            </div>
        `;
    }

    function renderAIResponse(data, container) {
        // 1. Answer
        const formattedAnswer = data.answer.replace(/\n/g, '<br>');

        let html = `
            <div class="ai-answer-box">
                <h3 style="margin-bottom:10px; color:#9b59b6;">AI Answer</h3>
                <p>${formattedAnswer}</p>
            </div>
        `;

        // 2. Sources
        if (data.context && data.context.length > 0) {
            html += `<div class="ai-sources-title">Reference Sources</div>`;

            // Deduplicate sources based on 'source' path
            const uniqueSources = [];
            const seen = new Set();
            data.context.forEach(chunk => {
                if (!seen.has(chunk.source)) {
                    seen.add(chunk.source);
                    uniqueSources.push(chunk);
                }
            });

            uniqueSources.forEach(source => {
                html += `
                    <div class="result-item" style="padding: 15px; margin-bottom: 10px; border-left-color: #9b59b6;">
                        <a href="${source.source}" class="result-title" target="_blank">${source.title || source.source}</a>
                        <p class="result-desc" style="font-size: 0.9rem;">
                            Match Score: ${(source.score * 100).toFixed(1)}%
                        </p>
                    </div>
                `;
            });
        }

        container.innerHTML = html;
    }
});

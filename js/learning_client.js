document.addEventListener('DOMContentLoaded', () => {
    const tabStandard = document.getElementById('tab-standard');
    const tabAi = document.getElementById('tab-ai');
    const tabQuantum = document.getElementById('tab-quantum');

    const standardView = document.getElementById('standard-search-view');
    const aiView = document.getElementById('ai-search-view');
    const quantumView = document.getElementById('quantum-view');

    const aiInput = document.getElementById('aiInput');
    const aiResultsContainer = document.getElementById('aiResultsContainer');
    const ingestBtn = document.getElementById('ingestBtn');

    const quantumInput = document.getElementById('quantumInput');
    const externalUrlInput = document.getElementById('externalUrlInput');
    const addResourceBtn = document.getElementById('addResourceBtn');
    const quantumResultsContainer = document.getElementById('quantumResultsContainer');

    const API_BASE = 'http://localhost:5000/api/learning';

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
            quantumInput.focus();
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
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(aiInput.value.trim(), 'project', aiResultsContainer);
        }
    });

    // Quantum Search Logic
    quantumInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(quantumInput.value.trim(), 'quantum', quantumResultsContainer);
        }
    });

    // Ingestion Logic (Project)
    ingestBtn.addEventListener('click', async () => {
        const confirm = window.confirm("This will re-scan all project files and update the AI's knowledge base. Continue?");
        if (!confirm) return;

        ingestBtn.disabled = true;
        ingestBtn.textContent = "Ingesting...";
        ingestBtn.style.opacity = "0.7";

        try {
            const response = await fetch(`${API_BASE}/ingest`, { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                alert(`Success! Processed ${data.data.processedFiles} files.`);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert("Failed to connect to backend.");
        } finally {
            ingestBtn.disabled = false;
            ingestBtn.textContent = "↻ Re-learn Data";
            ingestBtn.style.opacity = "1";
        }
    });

    // External Resource Ingestion
    addResourceBtn.addEventListener('click', async () => {
        const url = externalUrlInput.value.trim();
        if (!url) {
            alert("Please enter a valid URL.");
            return;
        }

        addResourceBtn.disabled = true;
        addResourceBtn.textContent = "Adding...";

        try {
            const response = await fetch(`${API_BASE}/ingest-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await response.json();

            if (response.ok) {
                alert(`Success! Learned from ${data.data.title}`);
                externalUrlInput.value = '';
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert("Failed to add resource.");
        } finally {
            addResourceBtn.disabled = false;
            addResourceBtn.textContent = "+ Add Resource";
        }
    });

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

// Voice Assistant Script
// Injects a button to read the page content aloud

(function () {
    // Create the button styles
    const style = document.createElement('style');
    style.textContent = `
        #voice-assistant-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        #voice-assistant-btn {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            padding: 0;
        }
        
        #voice-assistant-btn:hover {
            transform: scale(1.05) translateY(-5px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            background: rgba(255, 255, 255, 0.15);
        }
        
        #voice-assistant-btn.speaking {
            border-color: #6366f1;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }

        .avatar-svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        .mouth {
            transition: d 0.1s ease-in-out;
        }
    `;
    document.head.appendChild(style);

    // Create the container
    const container = document.createElement('div');
    container.id = 'voice-assistant-container';
    document.body.appendChild(container);

    // Create the button
    const btn = document.createElement('button');
    btn.id = 'voice-assistant-btn';
    btn.title = 'AI Voice Assistant';
    btn.setAttribute('aria-label', 'Toggle Voice Assistant');

    // Simple stylized human avatar SVG
    btn.innerHTML = `
        <svg class="avatar-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Face -->
            <circle cx="50" cy="45" r="35" fill="#f3e5ab" />
            <!-- Eyes -->
            <circle cx="40" cy="40" r="4" fill="#333" />
            <circle cx="60" cy="40" r="4" fill="#333" />
            <!-- Mouth (Closed by default) -->
            <path id="avatar-mouth" class="mouth" d="M 40 60 Q 50 60 60 60" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" />
            <!-- Hair/Cap -->
            <path d="M 15 45 Q 15 10 50 10 Q 85 10 85 45" fill="#333" />
        </svg>
    `;
    container.appendChild(btn);

    // Speech synthesis variables
    let isSpeaking = false;
    let utterance = null;
    const synth = window.speechSynthesis;

    // Avatar animation variables
    const mouth = document.getElementById('avatar-mouth');
    const mouthClosed = 'M 40 60 Q 50 60 60 60';
    const mouthOpen = 'M 40 60 Q 50 65 60 60';
    const mouthWide = 'M 38 60 Q 50 68 62 60';
    let animationId = null;

    function getPageText() {
        // Targeted selection: only P and H1-H6 tags within the main content area
        const contentContainer = document.querySelector('main') || document.querySelector('article') || document.body;

        // Select all relevant text elements
        const elements = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p');

        // Extract text, filter emojis, and join
        const textParts = Array.from(elements).map(el => {
            let text = el.innerText;
            // Remove emojis using a regex range for surrogate pairs and other symbols
            text = text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2B06}\u{2B07}\u{2B05}\u{2934}\u{2935}\u{200D}]/gu, '');
            return text.trim();
        }).filter(text => text.length > 0); // Remove empty strings

        return textParts.join('. ');
    }

    function stopSpeaking() {
        if (synth.speaking) {
            synth.cancel();
        }
        isSpeaking = false;
        container.classList.remove('speaking');
        cancelAnimationFrame(animationId);
        mouth.setAttribute('d', mouthClosed);
    }

    function animateMouth() {
        if (!isSpeaking) return;

        // Simple rhythmic lip-sync simulation
        const time = Date.now() / 150;
        const phase = Math.sin(time);

        if (phase > 0.5) {
            mouth.setAttribute('d', mouthWide);
        } else if (phase > -0.5) {
            mouth.setAttribute('d', mouthOpen);
        } else {
            mouth.setAttribute('d', mouthClosed);
        }

        animationId = requestAnimationFrame(animateMouth);
    }

    function startSpeaking() {
        if (synth.speaking) {
            // If already speaking, stop first (handling potential stuck state)
            synth.cancel();
        }

        const text = getPageText();
        if (!text.trim()) {
            alert("No text found to read.");
            return;
        }

        utterance = new SpeechSynthesisUtterance(text);

        // Select a high-quality "AI" voice
        const voices = synth.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Google UK English Female') || v.name.includes('Microsoft David') || v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
        }

        utterance.onend = () => {
            stopSpeaking();
        };

        utterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            stopSpeaking();
        };

        synth.speak(utterance);
        isSpeaking = true;
        container.classList.add('speaking');
        animateMouth();
    }

    // Handle click
    btn.addEventListener('click', () => {
        if (isSpeaking) {
            stopSpeaking();
        } else {
            startSpeaking();
        }
    });

    // Handle page unload to stop speech
    window.addEventListener('beforeunload', stopSpeaking);

})();

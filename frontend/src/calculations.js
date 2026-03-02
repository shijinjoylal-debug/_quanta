
document.addEventListener('DOMContentLoaded', () => {
    initSuperposition();
    initWaveParticle();
    initEntanglement();
});

// --- Superposition Calculator ---
function initSuperposition() {
    const alphaRInput = document.getElementById('alpha-r');
    const alphaIInput = document.getElementById('alpha-i');
    const resultDiv = document.getElementById('superposition-result');

    function updateProbabilities() {
        const ar = parseFloat(alphaRInput.value) || 0;
        const ai = parseFloat(alphaIInput.value) || 0;

        // Calculate |alpha|^2
        const alphaSq = (ar * ar) + (ai * ai);

        // Assume normalization: |beta|^2 = 1 - |alpha|^2
        let betaSq = 1 - alphaSq;
        let valid = true;

        if (betaSq < 0) {
            betaSq = 0;
            valid = false;
        }

        const p0 = (alphaSq * 100).toFixed(1);
        const p1 = (betaSq * 100).toFixed(1);

        if (!valid) {
            resultDiv.innerHTML = `
                <span style="color: #ff5e78">Error: $|\alpha|^2 > 1$</span><br>
                Probability must be ≤ 100%.
            `;
        } else {
            resultDiv.innerHTML = `
                Probability of |0⟩: ${p0}%<br>
                Probability of |1⟩: ${p1}%
            `;
        }

        // Re-render math if needed (though innerHTML updates might strip MathJax typeset)
        // Here we use plain text for results
    }

    alphaRInput.addEventListener('input', updateProbabilities);
    alphaIInput.addEventListener('input', updateProbabilities);
    updateProbabilities();
}

// --- Wave-Particle Calculator ---
function initWaveParticle() {
    const massSelect = document.getElementById('particle-select');
    const velInput = document.getElementById('velocity');
    const resultDiv = document.getElementById('wavelength-result');
    const h = 6.626e-34;

    function updateWavelength() {
        const m = parseFloat(massSelect.value);
        const v = parseFloat(velInput.value) || 0;

        if (v === 0) {
            resultDiv.innerText = "Velocity cannot be zero.";
            return;
        }

        const lambda = h / (m * v);

        // Format nicely
        let displayLambda = lambda;
        let unit = "m";

        if (lambda < 1e-9) {
            displayLambda = (lambda * 1e12).toExponential(2);
            unit = "pm";
        } else if (lambda < 1e-6) {
            displayLambda = (lambda * 1e9).toFixed(2);
            unit = "nm";
        }

        resultDiv.innerHTML = `Wavelength $\\lambda$:<br> ${displayLambda} ${unit}`;
    }

    massSelect.addEventListener('change', updateWavelength);
    velInput.addEventListener('input', updateWavelength);
    updateWavelength();
}

// --- Entanglement Simulator ---
function initEntanglement() {
    const btn = document.getElementById('measure-btn');
    const stateA = document.getElementById('qubit-a-state');
    const stateB = document.getElementById('qubit-b-state');
    const msg = document.getElementById('entanglement-msg');

    let isMeasured = false;

    btn.addEventListener('click', () => {
        if (isMeasured) {
            // Reset
            stateA.className = 'state-indicator unknown';
            stateA.innerText = '?';
            stateB.className = 'state-indicator unknown';
            stateB.innerText = '?';
            msg.innerText = "System is in Superposition";
            btn.innerText = "Measure Qubit A";
            isMeasured = false;
        } else {
            // Measure
            const result = Math.random() < 0.5 ? 0 : 1;

            // Adding a small delay for dramatic effect
            stateA.className = 'state-indicator unknown';
            stateA.innerText = '...';

            setTimeout(() => {
                const className = result === 0 ? 'zero' : 'one';
                const text = result === 0 ? '|0⟩' : '|1⟩';

                stateA.className = `state-indicator ${className}`;
                stateA.innerText = text;

                stateB.className = `state-indicator ${className}`;
                stateB.innerText = text;

                msg.innerText = `Collapsed to |${result}${result}⟩ state`;
                btn.innerText = "Reset System";
                isMeasured = true;
            }, 300);
        }
    });
}

/**
 * wave_engine.js - Pure JavaScript Stretched String Wave Physics Engine
 * ====================================================================
 * Simulates standing wave normal modes on a stretched string with fixed endpoints.
 * 
 * Physics - Standing Wave Equation (Dirichlet Boundary Conditions):
 *   y(x, t) = A * sin(n * pi * x / L) * cos(omega_n * t)
 * 
 * where:
 *   n       = harmonic index (1, 2, 3, 4)
 *   L       = string length
 *   v       = wave propagation speed = sqrt(T / mu)
 *   A       = amplitude
 *   omega_n = n * pi * v / L
 */

class WaveEngine {
    /**
     * Construct and initialize the wave engine.
     * @param {number} length - String length (pixels or arbitrary units)
     * @param {number} speed - Wave speed v = sqrt(T/mu)
     * @param {number} amplitude - Peak displacement amplitude
     */
    constructor(length, speed, amplitude) {
        if (length <= 0) throw new Error("WaveEngine: string length L must be > 0");
        if (speed <= 0) throw new Error("WaveEngine: wave speed v must be > 0");

        this.L = length;
        this.v = speed;
        this.A = amplitude;

        // Fundamental angular frequency: omega_1 = pi * v / L
        this.omega1 = Math.PI * this.v / this.L;
    }

    /**
     * Compute transverse displacement at position x, time t, for harmonic n.
     * @param {number} x - Position along string [0, L]
     * @param {number} t - Time in seconds
     * @param {number} n - Harmonic index (1, 2, 3, 4)
     * @returns {number} Transverse displacement y
     */
    compute(x, t, n) {
        this.validateN(n);

        // Wave number: k_n = n * pi / L
        const kn = n * Math.PI / this.L;

        // Angular frequency: omega_n = n * omega_1
        const omegan = n * this.omega1;

        // Standing wave displacement: y(x, t) = A * sin(k_n * x) * cos(omega_n * t)
        return this.A * Math.sin(kn * x) * Math.cos(omegan * t);
    }

    /**
     * Get angular frequency omega_n for harmonic n.
     */
    getAngularFrequency(n) {
        return n * this.omega1;
    }

    /**
     * Get frequency f_n in Hz for harmonic n.
     */
    getFrequency(n) {
        return n * this.omega1 / (2.0 * Math.PI);
    }

    /**
     * Get wavelength lambda_n for harmonic n.
     */
    getWavelength(n) {
        return 2.0 * this.L / n;
    }

    /**
     * Get internal node count for harmonic n (endpoints not counted).
     */
    getNodeCount(n) {
        return n - 1;
    }

    /**
     * Compute array of displacement values for rendering.
     * @param {number} t - Current simulation time
     * @param {number} n - Harmonic index
     * @param {number} numPoints - Number of sample points along the string
     * @returns {Float64Array} Float64Array containing y values
     */
    computeMode(t, n, numPoints) {
        this.validateN(n);
        if (numPoints < 2) throw new Error("WaveEngine: numPoints must be >= 2");

        const result = new Float64Array(numPoints);
        const kn = n * Math.PI / this.L;
        const omegan = n * this.omega1;
        const cosTerm = Math.cos(omegan * t);
        const dx = this.L / (numPoints - 1);

        for (let i = 0; i < numPoints; i++) {
            const x = i * dx;
            result[i] = this.A * Math.sin(kn * x) * cosTerm;
        }

        return result;
    }

    validateN(n) {
        if (n < 1) {
            throw new Error(`WaveEngine: harmonic index n must be >= 1 (got ${n})`);
        }
    }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveEngine;
} else {
    window.WaveEngine = WaveEngine;
}

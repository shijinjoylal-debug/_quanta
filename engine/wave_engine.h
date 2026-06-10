/**
 * wave_engine.h  —  Stretched String Wave Physics Engine
 * =========================================================
 * Models standing wave normal modes on a string with fixed endpoints.
 *
 * Physics — Wave Equation:
 *   ∂²y/∂t² = v² · ∂²y/∂x²
 *
 * Solutions (Dirichlet BCs: y(0,t) = y(L,t) = 0):
 *   y(x, t) = A · sin(nπx/L) · cos(ωₙt)
 *
 * Parameters:
 *   n  = harmonic index (1, 2, 3, 4, …)
 *   L  = string length
 *   v  = wave speed = √(T/μ),  T = tension, μ = linear mass density
 *   A  = amplitude
 *   ωₙ = nπv/L   (angular frequency of nth mode)
 *   kₙ = nπ/L    (wave number of nth mode)
 *   λₙ = 2L/n    (wavelength of nth mode)
 *   fₙ = n·f₁    (frequency of nth mode, linear harmonic series)
 *
 * ── WebAssembly Compilation (requires Emscripten) ──────────────────────────
 *   em++ -O2 wave_engine.cpp -o wave_engine.js          \
 *     -s WASM=1                                          \
 *     -s ALLOW_MEMORY_GROWTH=1                           \
 *     -s EXPORTED_FUNCTIONS='[                           \
 *         "_wave_engine_create",                         \
 *         "_wave_engine_destroy",                        \
 *         "_wave_engine_compute",                        \
 *         "_wave_engine_get_angular_frequency",          \
 *         "_wave_engine_get_frequency",                  \
 *         "_wave_engine_get_wavelength",                 \
 *         "_wave_engine_get_node_count",                 \
 *         "_wave_engine_compute_mode"                    \
 *     ]'                                                 \
 *     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]'
 * ────────────────────────────────────────────────────────────────────────────
 */

#pragma once

#include <cmath>
#include <vector>
#include <stdexcept>

static constexpr double WE_PI = 3.14159265358979323846;

// ─────────────────────────────────────────────────────────────────────────────
//  WaveMode  — descriptor for a single normal mode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Physical parameters describing a single standing wave mode on the string.
 */
struct WaveMode {
    int    n;          ///< Harmonic index  (1 = fundamental, 2 = 1st overtone, …)
    double omega;      ///< Angular frequency ωₙ = nπv/L  [rad / time-unit]
    double k;          ///< Wave number       kₙ = nπ/L    [rad / length-unit]
    double lambda;     ///< Wavelength        λₙ = 2L/n    [length-units]
    double frequency;  ///< Frequency         fₙ = ωₙ/2π  [Hz or 1/time-unit]
    int    nodeCount;  ///< Internal (non-endpoint) nodes  = n − 1
};

// ─────────────────────────────────────────────────────────────────────────────
//  WaveEngine  — core simulation engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulates standing wave normal modes on a stretched string with fixed
 * (Dirichlet) boundary conditions.
 *
 * Usage:
 *   WaveEngine engine(800.0, 200.0, 60.0);
 *   double y = engine.compute(x, t, n);   // displacement at (x, t) for mode n
 */
class WaveEngine {
public:
    double L;       ///< String length              [pixels / arbitrary units]
    double v;       ///< Wave propagation speed      [units/sec]
    double A;       ///< Peak transverse amplitude   [pixels / arbitrary units]
    double omega1;  ///< Fundamental angular freq.   ω₁ = πv/L

    /**
     * Construct and initialise the engine.
     * @param length     String length (pixels / arbitrary length units)
     * @param speed      Wave speed  v = √(T/μ)  (same length unit / sec)
     * @param amplitude  Peak displacement amplitude
     * @throws std::invalid_argument if length or speed ≤ 0
     */
    WaveEngine(double length, double speed, double amplitude);

    // ── Core computation ─────────────────────────────────────────────────────

    /**
     * Compute transverse displacement at position x, time t, for harmonic n.
     *
     *   y(x, t) = A · sin(nπx/L) · cos(ωₙt)
     *
     * @param x  Position along string  [0, L]
     * @param t  Time                   [sec]
     * @param n  Harmonic index         (≥ 1)
     * @return   Transverse displacement y
     */
    double compute(double x, double t, int n) const;

    // ── Mode queries ─────────────────────────────────────────────────────────

    /** Angular frequency of mode n:  ωₙ = n · ω₁ */
    double getAngularFrequency(int n) const noexcept;

    /** Oscillation frequency of mode n:  fₙ = ωₙ / (2π) */
    double getFrequency(int n) const noexcept;

    /** Wavelength of mode n:  λₙ = 2L/n */
    double getWavelength(int n) const noexcept;

    /** Number of internal (non-endpoint) nodes for mode n:  n − 1 */
    int getNodeCount(int n) const noexcept;

    /** Return a fully populated WaveMode descriptor for mode n */
    WaveMode getModeInfo(int n) const;

    // ── Batch computation ─────────────────────────────────────────────────────

    /**
     * Fill a buffer with displacement values for numPoints evenly-spaced
     * positions [0, L] at time t, for harmonic n.
     *
     * Useful for rendering — call once per animation frame.
     *
     * @param t          Current simulation time
     * @param n          Harmonic index
     * @param numPoints  Number of sample points (≥ 2)
     * @return  std::vector<double> of size numPoints containing y values
     */
    std::vector<double> computeMode(double t, int n, int numPoints) const;

private:
    // Validate harmonic index; throw if invalid
    void validateN(int n) const;
};

// ─────────────────────────────────────────────────────────────────────────────
//  C / WebAssembly exports
// ─────────────────────────────────────────────────────────────────────────────

extern "C" {

/**
 * Allocate a WaveEngine on the heap.
 * Must be freed with wave_engine_destroy().
 * @return Opaque pointer (cast to WaveEngine* internally)
 */
WaveEngine* wave_engine_create(double L, double v, double A);

/** Free a WaveEngine previously created with wave_engine_create(). */
void wave_engine_destroy(WaveEngine* engine);

/** Compute y(x, t, n).  Mirrors WaveEngine::compute(). */
double wave_engine_compute(WaveEngine* engine, double x, double t, int n);

/** Get angular frequency ωₙ for harmonic n. */
double wave_engine_get_angular_frequency(WaveEngine* engine, int n);

/** Get frequency fₙ (Hz) for harmonic n. */
double wave_engine_get_frequency(WaveEngine* engine, int n);

/** Get wavelength λₙ for harmonic n. */
double wave_engine_get_wavelength(WaveEngine* engine, int n);

/** Get internal node count (n − 1) for harmonic n. */
int wave_engine_get_node_count(WaveEngine* engine, int n);

/**
 * Fill outBuffer (caller-allocated, size numPoints) with displacement
 * values for harmonic n at time t, sampled evenly over [0, L].
 *
 * This is the primary render-loop entry point for WebAssembly usage:
 *   const buf = Module._malloc(numPoints * 8);   // 8 bytes per double
 *   wave_engine_compute_mode(engine, t, n, numPoints, buf);
 *   const view = new Float64Array(Module.HEAPF64.buffer, buf, numPoints);
 */
void wave_engine_compute_mode(WaveEngine* engine, double t, int n,
                               int numPoints, double* outBuffer);

} // extern "C"

/**
 * wave_engine.cpp  —  Stretched String Wave Physics Engine
 * =========================================================
 *
 * Standing wave equation on a string clamped at both ends (x = 0 and x = L):
 *
 *   y(x, t) = A · sin(nπx/L) · cos(ωₙt)
 *
 * where:
 *   ωₙ  = nπv/L          angular frequency of nth normal mode
 *   v   = √(T / μ)       wave speed  (T = tension, μ = linear density)
 *   kₙ  = nπ/L           wave number of nth mode
 *   λₙ  = 2L / n         wavelength  of nth mode
 *   fₙ  = n · f₁         frequency   of nth mode  (harmonic series 1:2:3:4)
 *
 * Boundary conditions satisfied for all t:
 *   y(0, t) = A·sin(0)·cos(ωₙt) = 0   ✓
 *   y(L, t) = A·sin(nπ)·cos(ωₙt) = 0  ✓
 *
 * Normal modes supported:   n = 1 (fundamental) through n = 4 (3rd overtone)
 *   n = 1 :  0 internal nodes,  1 antinode  (half wavelength fits in L)
 *   n = 2 :  1 internal node,   2 antinodes (full wavelength fits in L)
 *   n = 3 :  2 internal nodes,  3 antinodes (3/2 wavelengths fit in L)
 *   n = 4 :  3 internal nodes,  4 antinodes (2 full wavelengths fit in L)
 */

#include "wave_engine.h"
#include <stdexcept>
#include <sstream>

// ─────────────────────────────────────────────────────────────────────────────
//  WaveEngine — constructor
// ─────────────────────────────────────────────────────────────────────────────

WaveEngine::WaveEngine(double length, double speed, double amplitude)
    : L(length), v(speed), A(amplitude)
{
    if (L <= 0.0)
        throw std::invalid_argument("WaveEngine: string length L must be > 0");
    if (v <= 0.0)
        throw std::invalid_argument("WaveEngine: wave speed v must be > 0");

    // Fundamental angular frequency:  ω₁ = πv/L
    omega1 = WE_PI * v / L;
}

// ─────────────────────────────────────────────────────────────────────────────
//  WaveEngine — core computation
// ─────────────────────────────────────────────────────────────────────────────

double WaveEngine::compute(double x, double t, int n) const
{
    validateN(n);

    // Wave number for nth mode:        kₙ = nπ/L
    const double kn     = static_cast<double>(n) * WE_PI / L;

    // Angular frequency for nth mode:  ωₙ = n·ω₁
    const double omegan = static_cast<double>(n) * omega1;

    // Standing wave displacement:  y(x,t) = A · sin(kₙx) · cos(ωₙt)
    return A * std::sin(kn * x) * std::cos(omegan * t);
}

// ─────────────────────────────────────────────────────────────────────────────
//  WaveEngine — mode queries
// ─────────────────────────────────────────────────────────────────────────────

double WaveEngine::getAngularFrequency(int n) const noexcept
{
    return static_cast<double>(n) * omega1;
}

double WaveEngine::getFrequency(int n) const noexcept
{
    //  fₙ = ωₙ / (2π)
    return static_cast<double>(n) * omega1 / (2.0 * WE_PI);
}

double WaveEngine::getWavelength(int n) const noexcept
{
    //  λₙ = 2L / n
    return 2.0 * L / static_cast<double>(n);
}

int WaveEngine::getNodeCount(int n) const noexcept
{
    //  Internal (non-endpoint) nodes for mode n  =  n − 1
    return n - 1;
}

WaveMode WaveEngine::getModeInfo(int n) const
{
    validateN(n);

    WaveMode mode;
    mode.n         = n;
    mode.omega     = getAngularFrequency(n);
    mode.k         = static_cast<double>(n) * WE_PI / L;
    mode.lambda    = getWavelength(n);
    mode.frequency = getFrequency(n);
    mode.nodeCount = getNodeCount(n);
    return mode;
}

// ─────────────────────────────────────────────────────────────────────────────
//  WaveEngine — batch computation
// ─────────────────────────────────────────────────────────────────────────────

std::vector<double> WaveEngine::computeMode(double t, int n, int numPoints) const
{
    validateN(n);
    if (numPoints < 2)
        throw std::invalid_argument("WaveEngine::computeMode: numPoints must be >= 2");

    std::vector<double> result(static_cast<std::size_t>(numPoints));

    // Precompute constants for this mode  (avoids recomputing inside loop)
    const double kn     = static_cast<double>(n) * WE_PI / L;
    const double omegan = static_cast<double>(n) * omega1;
    const double cosTerm = std::cos(omegan * t);   // constant over all x

    const double dx = L / static_cast<double>(numPoints - 1);

    for (int i = 0; i < numPoints; i++) {
        const double x = static_cast<double>(i) * dx;
        result[static_cast<std::size_t>(i)] = A * std::sin(kn * x) * cosTerm;
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  WaveEngine — private helpers
// ─────────────────────────────────────────────────────────────────────────────

void WaveEngine::validateN(int n) const
{
    if (n < 1) {
        std::ostringstream oss;
        oss << "WaveEngine: harmonic index n must be >= 1 (got " << n << ")";
        throw std::invalid_argument(oss.str());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  C / WebAssembly export implementations
// ─────────────────────────────────────────────────────────────────────────────

extern "C" {

WaveEngine* wave_engine_create(double L, double v, double A)
{
    return new WaveEngine(L, v, A);
}

void wave_engine_destroy(WaveEngine* engine)
{
    delete engine;
}

double wave_engine_compute(WaveEngine* engine, double x, double t, int n)
{
    return engine->compute(x, t, n);
}

double wave_engine_get_angular_frequency(WaveEngine* engine, int n)
{
    return engine->getAngularFrequency(n);
}

double wave_engine_get_frequency(WaveEngine* engine, int n)
{
    return engine->getFrequency(n);
}

double wave_engine_get_wavelength(WaveEngine* engine, int n)
{
    return engine->getWavelength(n);
}

int wave_engine_get_node_count(WaveEngine* engine, int n)
{
    return engine->getNodeCount(n);
}

void wave_engine_compute_mode(WaveEngine* engine, double t, int n,
                               int numPoints, double* outBuffer)
{
    if (!engine || !outBuffer || numPoints < 2)
        return;

    const double kn      = static_cast<double>(n) * WE_PI / engine->L;
    const double omegan  = static_cast<double>(n) * engine->omega1;
    const double cosTerm = std::cos(omegan * t);
    const double dx      = engine->L / static_cast<double>(numPoints - 1);

    for (int i = 0; i < numPoints; i++) {
        const double x = static_cast<double>(i) * dx;
        outBuffer[i]   = engine->A * std::sin(kn * x) * cosTerm;
    }
}

} // extern "C"

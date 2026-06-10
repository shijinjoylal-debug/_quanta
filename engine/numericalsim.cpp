#include <iostream>
#include <vector>
#include <cmath>
#include <fstream>

class StringSimulation
{
private:
    int points;
    float length;
    float tension;
    float density;
    float dx;
    float dt;
    float c;
    float r;

    std::vector<float> previous;
    std::vector<float> current;
    std::vector<float> next;

public:
    StringSimulation(
        int numPoints,
        float stringLength,
        float stringTension,
        float linearDensity)
    {
        points = numPoints;
        length = stringLength;
        tension = stringTension;
        density = linearDensity;

        c = std::sqrt(tension / density);

        dx = length / (points - 1);

        dt = 0.9f * dx / c;

        r = c * dt / dx;

        previous.resize(points, 0.0f);
        current.resize(points, 0.0f);
        next.resize(points, 0.0f);
    }

    void pluck(float position, float amplitude)
    {
        int center = static_cast<int>(position * (points - 1));

        for (int i = 0; i < points; i++)
        {
            if (i <= center)
            {
                current[i] =
                    amplitude * (float)i / center;
            }
            else
            {
                current[i] =
                    amplitude *
                    (float)(points - 1 - i) /
                    (points - 1 - center);
            }
        }

        previous = current;
    }

    void gaussianPulse(float position, float amplitude, float width)
    {
        for (int i = 0; i < points; i++)
        {
            float x = (float)i / (points - 1);

            float d = x - position;

            current[i] =
                amplitude *
                std::exp(-(d * d) / (2.0f * width * width));
        }

        previous = current;
    }

    void update()
    {
        next[0] = 0.0f;
        next[points - 1] = 0.0f;

        for (int i = 1; i < points - 1; i++)
        {
            next[i] =
                2.0f * current[i]
                - previous[i]
                + r * r *
                (
                    current[i + 1]
                    - 2.0f * current[i]
                    + current[i - 1]
                );
        }

        previous = current;
        current = next;
    }

    const std::vector<float>& getDisplacement() const
    {
        return current;
    }
};

int main()
{
    const int NUM_POINTS = 300;

    StringSimulation stringSim(
        NUM_POINTS,
        1.0f,
        100.0f,
        0.01f
    );

    stringSim.pluck(0.35f, 0.15f);

    for (int frame = 0; frame < 5000; frame++)
    {
        stringSim.update();

        const auto& y =
            stringSim.getDisplacement();

        std::cout << "Frame " << frame << "\n";

        for (float value : y)
        {
            std::cout << value << " ";
        }

        std::cout << "\n";
    }

    return 0;
}
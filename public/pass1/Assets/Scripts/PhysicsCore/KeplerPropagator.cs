using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Osculating elements from a point-mass inertial state.
    /// a = 1/α with α = 2/r − v²/μ. Positive ellipse, negative hyperbola, infinite parabola.
    /// </summary>
    public struct KeplerElements
    {
        public double SemiMajorAxisM;
        public double Eccentricity;
        public double SpecificEnergyM2S2;
        public double AlphaPerM;
    }

    public struct KeplerState
    {
        public Vector3d Position;
        public Vector3d Velocity;
    }

    /// <summary>Inertial state frozen at the instant thrust becomes zero.</summary>
    public sealed class KeplerCapture
    {
        public double TimeS;
        public Vector3d Position;
        public Vector3d Velocity;
        public double MuM3S2;
        public double PropellantKg;
        public double TotalMassKg;
        public double ThrustIntegratedDeltaVMps;
        public KeplerElements Elements;
    }

    /// <summary>
    /// Universal-variable Kepler step (Battin / Vallado).
    /// Ellipse, parabola, and hyperbola. Drag is not part of this propagator.
    /// μ ≤ 0 is uniform rectilinear motion.
    /// </summary>
    public static class KeplerPropagator
    {
        public static KeplerElements Elements(Vector3d position, Vector3d velocity, double muM3S2)
        {
            double radius = position.Magnitude;
            double speedSq = velocity.SqrMagnitude;
            double energy = 0.5d * speedSq;
            if (muM3S2 > 0d && radius > 0d) energy -= muM3S2 / radius;

            if (!(muM3S2 > 0d) || !(radius > 0d))
            {
                return new KeplerElements
                {
                    SemiMajorAxisM = double.PositiveInfinity,
                    Eccentricity = 0d,
                    SpecificEnergyM2S2 = energy,
                    AlphaPerM = 0d
                };
            }

            double alpha = 2d / radius - speedSq / muM3S2;
            double semiMajor = Math.Abs(alpha) < 1e-14d ? double.PositiveInfinity : 1d / alpha;
            Vector3d h = position.Cross(velocity);
            Vector3d eccentricityVector = velocity.Cross(h) * (1d / muM3S2) - position * (1d / radius);
            return new KeplerElements
            {
                SemiMajorAxisM = semiMajor,
                Eccentricity = eccentricityVector.Magnitude,
                SpecificEnergyM2S2 = energy,
                AlphaPerM = Math.Abs(alpha) < 1e-14d ? 0d : alpha
            };
        }

        public static double StumpffC(double z)
        {
            if (z > 1e-4d)
            {
                double s = Math.Sqrt(z);
                return (1d - Math.Cos(s)) / z;
            }

            if (z < -1e-4d)
            {
                double s = Math.Sqrt(-z);
                return (Math.Cosh(s) - 1d) / -z;
            }

            return 0.5d - z / 24d + (z * z) / 720d - (z * z * z) / 40320d;
        }

        public static double StumpffS(double z)
        {
            if (z > 1e-4d)
            {
                double s = Math.Sqrt(z);
                return (s - Math.Sin(s)) / (s * s * s);
            }

            if (z < -1e-4d)
            {
                double s = Math.Sqrt(-z);
                return (Math.Sinh(s) - s) / (s * s * s);
            }

            return 1d / 6d - z / 120d + (z * z) / 5040d - (z * z * z) / 362880d;
        }

        /// <summary>dt = 0 returns the captured state.</summary>
        public static KeplerState Propagate(Vector3d position, Vector3d velocity, double muM3S2, double dtS)
        {
            if (!(dtS != 0d))
            {
                return new KeplerState { Position = position, Velocity = velocity };
            }

            if (!(muM3S2 > 0d))
            {
                return new KeplerState { Position = position + velocity * dtS, Velocity = velocity };
            }

            double radius = position.Magnitude;
            double speedSq = velocity.SqrMagnitude;
            double radialRate = position.Dot(velocity);
            double sqrtMu = Math.Sqrt(muM3S2);
            double alpha = 2d / radius - speedSq / muM3S2;
            double chi = InitialChi(alpha, radius, radialRate, muM3S2, dtS, sqrtMu);

            for (int i = 0; i < 40; i++)
            {
                double z = alpha * chi * chi;
                double c = StumpffC(z);
                double s = StumpffS(z);
                double residual =
                    (radialRate / sqrtMu) * chi * chi * c
                    + (1d - alpha * radius) * chi * chi * chi * s
                    + radius * chi
                    - sqrtMu * dtS;
                double derivative =
                    (radialRate / sqrtMu) * chi * (1d - z * s)
                    + (1d - alpha * radius) * chi * chi * c
                    + radius;
                if (!(Math.Abs(derivative) > 0d)) break;
                double ratio = residual / derivative;
                chi -= ratio;
                if (Math.Abs(ratio) < 1e-12d) break;
            }

            double zFinal = alpha * chi * chi;
            double cFinal = StumpffC(zFinal);
            double sFinal = StumpffS(zFinal);
            double f = 1d - (chi * chi * cFinal) / radius;
            double g = dtS - (chi * chi * chi * sFinal) / sqrtMu;
            Vector3d nextPosition = position * f + velocity * g;
            double nextRadius = nextPosition.Magnitude;
            double fDot = (sqrtMu / (nextRadius * radius)) * chi * (zFinal * sFinal - 1d);
            double gDot = 1d - (chi * chi * cFinal) / nextRadius;
            Vector3d nextVelocity = position * fDot + velocity * gDot;
            return new KeplerState { Position = nextPosition, Velocity = nextVelocity };
        }

        private static double InitialChi(
            double alpha,
            double radius,
            double radialRate,
            double mu,
            double dt,
            double sqrtMu)
        {
            if (alpha > 1e-8d) return sqrtMu * dt * alpha;
            if (alpha < -1e-8d)
            {
                double semi = 1d / alpha;
                double sqrtNegA = Math.Sqrt(-semi);
                int sign = Math.Sign(dt);
                double denom = radialRate + sign * Math.Sqrt(-mu * semi) * (1d - radius * alpha);
                double numer = -2d * mu * alpha * dt;
                if (denom != 0d && numer / denom > 0d) return sign * sqrtNegA * Math.Log(numer / denom);
            }

            return (sqrtMu * dt) / radius;
        }
    }
}

using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;

    /// <summary>
    /// Pitch PD on body Z. δ = −(Kp θ_err + Kd ωz), clamped to ±5°.
    /// θ = 2 atan2(q.z, q.w) after the scalar is made non-negative.
    /// Controller off leaves the open-loop gimbal untouched.
    /// </summary>
    public static class AttitudeController
    {
        public const double Kp = 1d;
        public const double Kd = 1.5d;
        public const double GimbalLimitRad = 5d * Math.PI / 180d;
        public const double PitchTargetRad = 0d;

        public static double PitchAngleRad(QuaternionD attitude)
        {
            double z = attitude.Z;
            double w = attitude.W;
            if (w < 0d)
            {
                z = -z;
                w = -w;
            }
            return 2d * Math.Atan2(z, w);
        }

        public static double PitchErrorRad(QuaternionD attitude, double targetRad)
        {
            return PitchAngleRad(attitude) - targetRad;
        }

        public static double Command(QuaternionD attitude, double omegaZ)
        {
            return Command(attitude, omegaZ, PitchTargetRad);
        }

        public static double Command(QuaternionD attitude, double omegaZ, double targetRad)
        {
            double delta = -(Kp * PitchErrorRad(attitude, targetRad) + Kd * omegaZ);
            if (delta > GimbalLimitRad) return GimbalLimitRad;
            if (delta < -GimbalLimitRad) return -GimbalLimitRad;
            if (delta == 0d) return 0d;
            return delta;
        }

        public static double VerticalTargetRad(Vector3d position)
        {
            double radius = position.Magnitude;
            if (!(radius > 0d)) return 0d;
            return Math.Atan2(-position.X / radius, position.Y / radius);
        }

        public static double VerticalPitchErrorRad(QuaternionD attitude, Vector3d position)
        {
            return PitchErrorRad(attitude, VerticalTargetRad(position));
        }

        public static double EffectiveGimbal(VehicleState state)
        {
            if (!state.ControllerEnabled) return state.GimbalRad;
            return Command(state.Attitude, state.AngularVelocityBody.Z, state.PitchTargetRad);
        }
    }
}

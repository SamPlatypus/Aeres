using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    public struct TerminalCommand
    {
        public string Phase;
        public double Throttle;
        public Vector3d Direction;
        public double PitchFromVerticalDeg;
        /// <summary>0 keeps pure vertical. Set only on the landing burn when a horizontal share is commanded.</summary>
        public double HorizontalFraction;
        /// <summary>Proportional when that law is commanding. Empty on the fixed-fraction path.</summary>
        public string GuidanceMode;
    }

    public struct ImpactAssessment
    {
        public double VerticalMps;
        public double HorizontalMps;
        public double SpeedMps;
        public double KineticEnergyJ;
        public string Flag;
        public double PeakSpeedMps;
    }

    /// <summary>
    /// Open-loop flip to local vertical, then a constant landing thrust.
    /// No rotational state. Armed only by RunMarsTerminalLanding.
    /// </summary>
    public sealed class TerminalSequence
    {
        public const double DefaultTriggerAltitudeM = 3_000d;
        public const double DefaultFlipDurationS = 8d;
        public const double DefaultFlipThrottle = 0d;
        public const double DefaultLandingThrottle = 0.6d;
        public const double NominalVerticalMps = 2d;
        public const double NominalHorizontalMps = 0.5d;
        public const double EarlyTriggerAltitudeM = 5_000d;
        public const double EarlyLandingThrottle = 1d;
        public const double MaxTimeS = 2_400d;
        public const double DefaultProportionalGain = 1d;
        public const double DefaultProportionalSpeedRefMps = 500d;
        public const double DefaultMaxHorizontalFraction = 0.75d;

        public readonly double? TriggerAltitudeM;
        public readonly double? TriggerTimeS;
        public readonly double FlipDurationS;
        public readonly double FlipThrottle;
        public readonly double LandingThrottle;
        public readonly double? ManualCutoffS;
        /// <summary>0 is the Pass 6 vertical landing burn. (0, 1] blends anti-horizontal thrust.</summary>
        public readonly double HorizontalFraction;
        /// <summary>FixedFraction or Proportional. FixedFraction is the Pass 7 path.</summary>
        public readonly string GuidanceMode;
        public readonly double ProportionalGain;
        public readonly double ProportionalSpeedRefMps;
        public readonly double MaxHorizontalFraction;

        private double? _triggerAtS;
        private Vector3d _retrograde;
        private bool _hasRetrograde;

        public double? ArmedAtS
        {
            get { return _triggerAtS; }
        }

        public TerminalSequence(
            double? triggerAltitudeM,
            double? triggerTimeS,
            double flipDurationS,
            double flipThrottle,
            double landingThrottle,
            double? manualCutoffS,
            double horizontalFraction = 0d,
            string guidanceMode = "FixedFraction",
            double proportionalGain = 1d,
            double proportionalSpeedRefMps = 500d,
            double maxHorizontalFraction = 0.75d)
        {
            TriggerAltitudeM = triggerAltitudeM;
            TriggerTimeS = triggerTimeS;
            FlipDurationS = flipDurationS;
            FlipThrottle = flipThrottle;
            LandingThrottle = landingThrottle;
            ManualCutoffS = manualCutoffS;
            if (horizontalFraction < 0d) horizontalFraction = 0d;
            if (horizontalFraction > 1d) horizontalFraction = 1d;
            HorizontalFraction = horizontalFraction;
            GuidanceMode = string.IsNullOrEmpty(guidanceMode) ? "FixedFraction" : guidanceMode;
            ProportionalGain = proportionalGain;
            ProportionalSpeedRefMps = proportionalSpeedRefMps;
            if (maxHorizontalFraction < 0d) maxHorizontalFraction = 0d;
            MaxHorizontalFraction = maxHorizontalFraction;
        }

        public static TerminalSequence DefaultProfile()
        {
            return new TerminalSequence(DefaultTriggerAltitudeM, null, DefaultFlipDurationS, DefaultFlipThrottle, DefaultLandingThrottle, null);
        }

        public static TerminalSequence EarlyProfile()
        {
            return new TerminalSequence(EarlyTriggerAltitudeM, null, DefaultFlipDurationS, DefaultFlipThrottle, EarlyLandingThrottle, null);
        }

        public static string TouchdownFlag(double verticalMps, double horizontalMps)
        {
            if (Math.Abs(verticalMps) <= NominalVerticalMps && horizontalMps <= NominalHorizontalMps) return "nominal";
            return "RUD";
        }

        public TerminalCommand Command(double timeS, Vector3d position, Vector3d velocity, double propellantKg, double altitudeM)
        {
            Vector3d up = LocalUp(position);
            if (!_triggerAtS.HasValue)
            {
                bool byTime = TriggerTimeS.HasValue && timeS >= TriggerTimeS.Value;
                bool byAltitude = TriggerAltitudeM.HasValue && altitudeM > 0d && altitudeM <= TriggerAltitudeM.Value;
                if (byTime || byAltitude)
                {
                    _triggerAtS = timeS;
                    _retrograde = velocity.Magnitude > 0d ? velocity.Normalized * -1d : up;
                    _hasRetrograde = true;
                }
            }

            if (!_triggerAtS.HasValue || !_hasRetrograde)
            {
                return Coast(up);
            }

            double elapsed = timeS - _triggerAtS.Value;
            bool cutoff = ManualCutoffS.HasValue && timeS >= ManualCutoffS.Value;
            if (elapsed < FlipDurationS && !cutoff)
            {
                double blend = FlipDurationS > 0d ? elapsed / FlipDurationS : 1d;
                Vector3d direction = SlerpUnit(_retrograde, up, blend);
                return new TerminalCommand
                {
                    Phase = "Flip",
                    Throttle = FlipThrottle,
                    Direction = direction,
                    PitchFromVerticalDeg = PitchFromVertical(direction, position)
                };
            }

            if (cutoff || propellantKg <= 0d)
            {
                return new TerminalCommand
                {
                    Phase = "Complete",
                    Throttle = 0d,
                    Direction = up,
                    PitchFromVerticalDeg = 0d
                };
            }

            if (GuidanceMode == "Proportional")
            {
                double fraction = ProportionalFraction(position, velocity);
                double blend = fraction > 1d ? 1d : fraction;
                Vector3d aim;
                double pitch;
                bool aimed = TryLandingAim(up, velocity, blend, out aim, out pitch);
                return new TerminalCommand
                {
                    Phase = "LandingBurn",
                    Throttle = LandingThrottle,
                    Direction = aimed ? aim : up,
                    PitchFromVerticalDeg = aimed ? pitch : 0d,
                    HorizontalFraction = fraction,
                    GuidanceMode = "Proportional"
                };
            }

            if (!(HorizontalFraction > 0d))
            {
                return new TerminalCommand
                {
                    Phase = "LandingBurn",
                    Throttle = LandingThrottle,
                    Direction = up,
                    PitchFromVerticalDeg = 0d
                };
            }

            Vector3d landingAim;
            double landingPitch;
            bool landingAimed = TryLandingAim(up, velocity, HorizontalFraction, out landingAim, out landingPitch);
            return new TerminalCommand
            {
                Phase = "LandingBurn",
                Throttle = LandingThrottle,
                Direction = landingAimed ? landingAim : up,
                PitchFromVerticalDeg = landingAimed ? landingPitch : 0d,
                HorizontalFraction = HorizontalFraction
            };
        }

        /// <summary>
        /// Landing aim. Returns false when the fraction is off or horizontal speed is zero,
        /// leaving the caller on pure local up.
        /// </summary>
        public static bool TryLandingAim(Vector3d up, Vector3d velocity, double fraction, out Vector3d direction, out double pitchDeg)
        {
            direction = up;
            pitchDeg = 0d;
            if (!(fraction > 0d)) return false;
            double f = fraction > 1d ? 1d : fraction;
            Vector3d horizontal = velocity - up * velocity.Dot(up);
            double speed = horizontal.Magnitude;
            if (!(speed > 0d)) return false;
            Vector3d opposition = horizontal * (-1d / speed);
            direction = (up * (1d - f) + opposition * f).Normalized;
            double cosine = direction.Dot(up);
            if (cosine > 1d) cosine = 1d;
            if (cosine < -1d) cosine = -1d;
            pitchDeg = Math.Acos(cosine) * 180d / Math.PI;
            return true;
        }

        /// <summary>clamp(k * horizontal speed / v_ref, 0, max fraction). Proportional mode only.</summary>
        public double ProportionalFraction(Vector3d position, Vector3d velocity)
        {
            double cap = MaxHorizontalFraction;
            if (cap < 0d) cap = 0d;
            double horizontal = PitchProgram.HorizontalSpeedMps(position, velocity);
            double fraction = ProportionalSpeedRefMps > 0d ? ProportionalGain * horizontal / ProportionalSpeedRefMps : 0d;
            if (!(fraction > 0d) || double.IsNaN(fraction)) fraction = 0d;
            if (fraction > cap) fraction = cap;
            return fraction;
        }

        public static ImpactAssessment Assess(VehicleState state, double peakSpeedMps)
        {
            double radius = state.Position.Magnitude;
            double vertical = radius > 0d ? state.Velocity.Dot(state.Position.Normalized) : 0d;
            double horizontal = PitchProgram.HorizontalSpeedMps(state.Position, state.Velocity);
            double speed = state.Velocity.Magnitude;
            return new ImpactAssessment
            {
                VerticalMps = vertical,
                HorizontalMps = horizontal,
                SpeedMps = speed,
                KineticEnergyJ = 0.5d * state.TotalMassKg * speed * speed,
                Flag = TouchdownFlag(vertical, horizontal),
                PeakSpeedMps = peakSpeedMps
            };
        }

        public static VehicleState SurfaceState(VehicleState before, VehicleState after, double radiusM, out double u)
        {
            Vector3d dp = after.Position - before.Position;
            double a = dp.SqrMagnitude;
            double b = 2d * before.Position.Dot(dp);
            double c = before.Position.SqrMagnitude - radiusM * radiusM;
            u = 1d;
            if (a > 0d)
            {
                double disc = b * b - 4d * a * c;
                if (disc >= 0d)
                {
                    double root = Math.Sqrt(disc);
                    double u1 = (-b - root) / (2d * a);
                    double u2 = (-b + root) / (2d * a);
                    bool any = false;
                    double best = 1d;
                    if (u1 >= -1e-9d && u1 <= 1d + 1e-9d)
                    {
                        best = u1;
                        any = true;
                    }
                    if (u2 >= -1e-9d && u2 <= 1d + 1e-9d && (!any || u2 < best))
                    {
                        best = u2;
                        any = true;
                    }
                    if (any)
                    {
                        if (best < 0d) best = 0d;
                        if (best > 1d) best = 1d;
                        u = best;
                    }
                }
            }

            Vector3d position = before.Position + dp * u;
            Vector3d onSurface = position.Magnitude > 0d ? position.Normalized * radiusM : new Vector3d(0d, radiusM, 0d);
            double propellant = Lerp(before.PropellantMassKg, after.PropellantMassKg, u);
            if (propellant < 0d) propellant = 0d;
            return new VehicleState
            {
                Position = onSurface,
                Velocity = new Vector3d(
                    Lerp(before.Velocity.X, after.Velocity.X, u),
                    Lerp(before.Velocity.Y, after.Velocity.Y, u),
                    Lerp(before.Velocity.Z, after.Velocity.Z, u)),
                PropellantMassKg = propellant,
                TotalMassKg = Lerp(before.TotalMassKg, after.TotalMassKg, u),
                ThrustIntegratedDeltaVMps = Lerp(before.ThrustIntegratedDeltaVMps, after.ThrustIntegratedDeltaVMps, u),
                InitialAttitude = before.InitialAttitude,
                AngularVelocityBody = new Vector3d(
                    Lerp(before.AngularVelocityBody.X, after.AngularVelocityBody.X, u),
                    Lerp(before.AngularVelocityBody.Y, after.AngularVelocityBody.Y, u),
                    Lerp(before.AngularVelocityBody.Z, after.AngularVelocityBody.Z, u)),
                Attitude = QuaternionD.Slerp(before.Attitude, after.Attitude, u)
            };
        }

        public static double InertialPitchFromYDeg(Vector3d direction)
        {
            double cosine = direction.Normalized.Y;
            if (cosine > 1d) cosine = 1d;
            if (cosine < -1d) cosine = -1d;
            return Math.Acos(cosine) * 180d / Math.PI;
        }

        private static TerminalCommand Coast(Vector3d up)
        {
            return new TerminalCommand
            {
                Phase = "Coast",
                Throttle = 0d,
                Direction = up,
                PitchFromVerticalDeg = 0d
            };
        }

        private static double PitchFromVertical(Vector3d direction, Vector3d position)
        {
            double radius = position.Magnitude;
            if (!(radius > 0d) || !(direction.Magnitude > 0d)) return 0d;
            double cosine = direction.Normalized.Dot(position.Normalized);
            if (cosine > 1d) cosine = 1d;
            if (cosine < -1d) cosine = -1d;
            return Math.Acos(cosine) * 180d / Math.PI;
        }

        private static Vector3d LocalUp(Vector3d position)
        {
            double radius = position.Magnitude;
            if (!(radius > 0d)) return Vector3d.Up;
            return position / radius;
        }

        private static Vector3d SlerpUnit(Vector3d from, Vector3d to, double u)
        {
            Vector3d a = from.Normalized;
            Vector3d b = to.Normalized;
            double clamped = u < 0d ? 0d : (u > 1d ? 1d : u);
            if (!(a.Magnitude > 0d)) return b.Magnitude > 0d ? b : Vector3d.Up;
            if (!(b.Magnitude > 0d)) return a;
            double dot = a.Dot(b);
            if (dot > 1d) dot = 1d;
            if (dot < -1d) dot = -1d;
            if (dot > 0.999999d) return b;
            if (dot < -0.999999d)
            {
                Vector3d side = Math.Abs(a.Y) < 0.9d ? a.Cross(Vector3d.Up).Normalized : a.Cross(new Vector3d(1d, 0d, 0d)).Normalized;
                return clamped < 0.5d ? SlerpUnit(a, side, clamped * 2d) : SlerpUnit(side, b, clamped * 2d - 1d);
            }
            double omega = Math.Acos(dot);
            double scale = Math.Sin(omega);
            return (a * (Math.Sin((1d - clamped) * omega) / scale) + b * (Math.Sin(clamped * omega) / scale)).Normalized;
        }

        private static double Lerp(double start, double end, double u)
        {
            return start + (end - start) * u;
        }
    }
}

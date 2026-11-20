using System;

namespace MarsMission.Math
{
    using Math = System.Math;
    /// <summary>
    /// Hamilton quaternion, double precision. Scalar is W. Vector part is X, Y, Z.
    /// Body-to-inertial attitude: v_inertial = q ⊗ v_body ⊗ q*.
    /// Kinematics: dq/dt = 0.5 * q ⊗ ω_body.
    /// </summary>
    public struct QuaternionD : IEquatable<QuaternionD>
    {
        public double X;
        public double Y;
        public double Z;
        public double W;

        public static readonly QuaternionD Identity = new QuaternionD(0d, 0d, 0d, 1d);
        public static readonly QuaternionD Zero = new QuaternionD(0d, 0d, 0d, 0d);

        public QuaternionD(double x, double y, double z, double w)
        {
            X = x;
            Y = y;
            Z = z;
            W = w;
        }

        public static QuaternionD Pure(Vector3d vector)
        {
            return new QuaternionD(vector.X, vector.Y, vector.Z, 0d);
        }

        public static bool AngularVelocityIsZero(Vector3d omega)
        {
            return omega.X == 0d && omega.Y == 0d && omega.Z == 0d;
        }

        public double SqrMagnitude
        {
            get { return X * X + Y * Y + Z * Z + W * W; }
        }

        public double Magnitude
        {
            get { return Math.Sqrt(SqrMagnitude); }
        }

        public QuaternionD Conjugate
        {
            get { return new QuaternionD(-X, -Y, -Z, W); }
        }

        public QuaternionD Inverse
        {
            get
            {
                double n = SqrMagnitude;
                if (!(n > 0d) || double.IsNaN(n)) return Identity;
                double inv = 1d / n;
                return new QuaternionD(-X * inv, -Y * inv, -Z * inv, W * inv);
            }
        }

        public QuaternionD Normalized
        {
            get
            {
                double mag = Magnitude;
                if (!(mag > 0d) || double.IsNaN(mag)) return Identity;
                return this / mag;
            }
        }

        public void Normalize()
        {
            QuaternionD n = Normalized;
            X = n.X;
            Y = n.Y;
            Z = n.Z;
            W = n.W;
        }

        public double Dot(QuaternionD other)
        {
            return X * other.X + Y * other.Y + Z * other.Z + W * other.W;
        }

        /// <summary>Body-frame vector into the inertial frame. q must be a unit quaternion.</summary>
        public Vector3d Rotate(Vector3d body)
        {
            QuaternionD rotated = this * Pure(body) * Conjugate;
            return new Vector3d(rotated.X, rotated.Y, rotated.Z);
        }

        public static QuaternionD FromAxisAngle(Vector3d axis, double angleRad)
        {
            Vector3d unit = axis.Normalized;
            double half = angleRad * 0.5d;
            double s = Math.Sin(half);
            return new QuaternionD(unit.X * s, unit.Y * s, unit.Z * s, Math.Cos(half));
        }

        /// <summary>
        /// Rotation angle of <paramref name="to"/> relative to <paramref name="from"/>, radians in [0, 2π).
        /// Identical attitudes return 0.
        /// </summary>
        public static double RotationAngleBetween(QuaternionD from, QuaternionD to)
        {
            if (from.X == to.X && from.Y == to.Y && from.Z == to.Z && from.W == to.W) return 0d;
            QuaternionD rel = (from.Inverse * to).Normalized;
            double v = Math.Sqrt(rel.X * rel.X + rel.Y * rel.Y + rel.Z * rel.Z);
            return 2d * Math.Atan2(v, rel.W);
        }

        public static QuaternionD Derivative(QuaternionD attitude, Vector3d omegaBody)
        {
            return (attitude * Pure(omegaBody)) * 0.5d;
        }

        /// <summary>
        /// One classical RK4 step of dq/dt = 0.5 * q ⊗ ω, then renormalize.
        /// Identically zero ω returns <paramref name="q0"/> unchanged.
        /// </summary>
        public static QuaternionD IntegrateRk4(QuaternionD q0, Vector3d omegaBody, double dt)
        {
            if (AngularVelocityIsZero(omegaBody)) return q0;
            if (!(dt > 0d) || double.IsNaN(dt)) return q0;

            QuaternionD k1 = Derivative(q0, omegaBody);
            QuaternionD k2 = Derivative(q0 + k1 * (dt * 0.5d), omegaBody);
            QuaternionD k3 = Derivative(q0 + k2 * (dt * 0.5d), omegaBody);
            QuaternionD k4 = Derivative(q0 + k3 * dt, omegaBody);
            QuaternionD sum = k1 + (k2 * 2d) + (k3 * 2d) + k4;
            return (q0 + sum * (dt / 6d)).Normalized;
        }

        /// <summary>
        /// Constant-rate kinematic advance. Renormalizes after every sub-step.
        /// Identically zero ω does not write the quaternion.
        /// </summary>
        public static QuaternionD IntegrateRk4Substeps(QuaternionD q0, Vector3d omegaBody, double dt, int substeps)
        {
            if (AngularVelocityIsZero(omegaBody)) return q0;
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");
            if (!(dt > 0d)) return q0;
            double h = dt / substeps;
            QuaternionD q = q0;
            for (int i = 0; i < substeps; i++)
            {
                q = IntegrateRk4(q, omegaBody, h);
            }
            return q;
        }

        /// <summary>Short-arc slerp. Equal attitudes return <paramref name="from"/> unchanged.</summary>
        public static QuaternionD Slerp(QuaternionD from, QuaternionD to, double u)
        {
            if (from.X == to.X && from.Y == to.Y && from.Z == to.Z && from.W == to.W) return from;
            QuaternionD target = to;
            double dot = from.Dot(to);
            if (dot < 0d)
            {
                target = -to;
                dot = -dot;
            }
            if (dot > 0.9995d)
            {
                return (from + (target - from) * u).Normalized;
            }
            double theta = Math.Acos(dot > 1d ? 1d : dot);
            double s = Math.Sin(theta);
            double a = Math.Sin((1d - u) * theta) / s;
            double b = Math.Sin(u * theta) / s;
            return (from * a + target * b).Normalized;
        }

        public bool Equals(QuaternionD other)
        {
            return X == other.X && Y == other.Y && Z == other.Z && W == other.W;
        }

        public override bool Equals(object obj)
        {
            return obj is QuaternionD other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                int hash = 17;
                hash = hash * 31 + X.GetHashCode();
                hash = hash * 31 + Y.GetHashCode();
                hash = hash * 31 + Z.GetHashCode();
                hash = hash * 31 + W.GetHashCode();
                return hash;
            }
        }

        public override string ToString()
        {
            return string.Format(
                System.Globalization.CultureInfo.InvariantCulture,
                "({0:R}, {1:R}, {2:R}, {3:R})",
                X,
                Y,
                Z,
                W);
        }

        public static QuaternionD operator +(QuaternionD a, QuaternionD b)
        {
            return new QuaternionD(a.X + b.X, a.Y + b.Y, a.Z + b.Z, a.W + b.W);
        }

        public static QuaternionD operator -(QuaternionD a, QuaternionD b)
        {
            return new QuaternionD(a.X - b.X, a.Y - b.Y, a.Z - b.Z, a.W - b.W);
        }

        public static QuaternionD operator -(QuaternionD q)
        {
            return new QuaternionD(-q.X, -q.Y, -q.Z, -q.W);
        }

        public static QuaternionD operator *(QuaternionD a, QuaternionD b)
        {
            return new QuaternionD(
                a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
                a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
                a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W,
                a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z);
        }

        public static QuaternionD operator *(QuaternionD q, double s)
        {
            return new QuaternionD(q.X * s, q.Y * s, q.Z * s, q.W * s);
        }

        public static QuaternionD operator *(double s, QuaternionD q)
        {
            return new QuaternionD(q.X * s, q.Y * s, q.Z * s, q.W * s);
        }

        public static QuaternionD operator /(QuaternionD q, double s)
        {
            return new QuaternionD(q.X / s, q.Y / s, q.Z / s, q.W / s);
        }

        public static bool operator ==(QuaternionD a, QuaternionD b)
        {
            return a.Equals(b);
        }

        public static bool operator !=(QuaternionD a, QuaternionD b)
        {
            return !a.Equals(b);
        }
    }
}

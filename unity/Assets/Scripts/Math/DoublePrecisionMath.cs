using System;

namespace MarsMission.Math
{
    using Math = System.Math;
    /// <summary>
    /// Double-precision inertial vector. All components are meters, meters/second,
    /// or newtons depending on the caller. No single-precision storage.
    /// </summary>
    public struct Vector3d : IEquatable<Vector3d>
    {
        public double X;
        public double Y;
        public double Z;

        public static readonly Vector3d Zero = new Vector3d(0d, 0d, 0d);
        public static readonly Vector3d Up = new Vector3d(0d, 1d, 0d);

        public Vector3d(double x, double y, double z)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public double SqrMagnitude
        {
            get { return X * X + Y * Y + Z * Z; }
        }

        public double Magnitude
        {
            get { return Math.Sqrt(SqrMagnitude); }
        }

        public Vector3d Normalized
        {
            get
            {
                double mag = Magnitude;
                if (!(mag > 0d) || double.IsNaN(mag)) return Zero;
                return this / mag;
            }
        }

        public void Normalize()
        {
            double mag = Magnitude;
            if (!(mag > 0d) || double.IsNaN(mag))
            {
                X = 0d;
                Y = 0d;
                Z = 0d;
                return;
            }

            double inv = 1d / mag;
            X *= inv;
            Y *= inv;
            Z *= inv;
        }

        public double Dot(Vector3d other)
        {
            return X * other.X + Y * other.Y + Z * other.Z;
        }

        public Vector3d Cross(Vector3d other)
        {
            return new Vector3d(
                Y * other.Z - Z * other.Y,
                Z * other.X - X * other.Z,
                X * other.Y - Y * other.X);
        }

        public static double Dot(Vector3d a, Vector3d b)
        {
            return a.X * b.X + a.Y * b.Y + a.Z * b.Z;
        }

        public static Vector3d Cross(Vector3d a, Vector3d b)
        {
            return a.Cross(b);
        }

        public bool Approximately(Vector3d other, double epsilon)
        {
            return (this - other).SqrMagnitude <= epsilon * epsilon;
        }

        public bool Equals(Vector3d other)
        {
            return X == other.X && Y == other.Y && Z == other.Z;
        }

        public override bool Equals(object obj)
        {
            return obj is Vector3d other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                int hash = 17;
                hash = hash * 31 + X.GetHashCode();
                hash = hash * 31 + Y.GetHashCode();
                hash = hash * 31 + Z.GetHashCode();
                return hash;
            }
        }

        public override string ToString()
        {
            return string.Format(
                System.Globalization.CultureInfo.InvariantCulture,
                "({0:R}, {1:R}, {2:R})",
                X,
                Y,
                Z);
        }

        public static Vector3d operator +(Vector3d a, Vector3d b)
        {
            return new Vector3d(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
        }

        public static Vector3d operator -(Vector3d a, Vector3d b)
        {
            return new Vector3d(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        }

        public static Vector3d operator -(Vector3d v)
        {
            return new Vector3d(-v.X, -v.Y, -v.Z);
        }

        public static Vector3d operator *(Vector3d v, double s)
        {
            return new Vector3d(v.X * s, v.Y * s, v.Z * s);
        }

        public static Vector3d operator *(double s, Vector3d v)
        {
            return new Vector3d(v.X * s, v.Y * s, v.Z * s);
        }

        public static Vector3d operator /(Vector3d v, double s)
        {
            return new Vector3d(v.X / s, v.Y / s, v.Z / s);
        }

        public static bool operator ==(Vector3d a, Vector3d b)
        {
            return a.Equals(b);
        }

        public static bool operator !=(Vector3d a, Vector3d b)
        {
            return !a.Equals(b);
        }
    }
}

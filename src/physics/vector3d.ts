/** Immutable double-precision 3-vector. IEEE-754 binary64, no single-precision path. */
export class Vector3d {
  static readonly zero = new Vector3d(0, 0, 0);
  static readonly up = new Vector3d(0, 1, 0);

  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(other: Vector3d): Vector3d {
    return new Vector3d(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  sub(other: Vector3d): Vector3d {
    return new Vector3d(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  scale(scalar: number): Vector3d {
    return new Vector3d(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  dot(other: Vector3d): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  cross(other: Vector3d): Vector3d {
    return new Vector3d(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
    );
  }

  get sqrMagnitude(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  get magnitude(): number {
    return Math.sqrt(this.sqrMagnitude);
  }

  get normalized(): Vector3d {
    const mag = this.magnitude;
    if (!(mag > 0)) return Vector3d.zero;
    return this.scale(1 / mag);
  }

  /** Immutable counterpart of the mutating C# Normalize(). */
  normalize(): Vector3d {
    return this.normalized;
  }
}

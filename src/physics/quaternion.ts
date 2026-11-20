import { Vector3d } from "./vector3d.ts";

/**
 * Hamilton quaternion. Scalar is w. Vector part is x, y, z.
 * Body-to-inertial: v_i = q ⊗ v_b ⊗ q*.
 * Kinematics: dq/dt = 0.5 * q ⊗ ω_body.
 */
export class QuaternionD {
  static readonly identity = new QuaternionD(0, 0, 0, 1);
  static readonly zero = new QuaternionD(0, 0, 0, 0);

  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;

  constructor(x: number, y: number, z: number, w: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static pure(vector: Vector3d): QuaternionD {
    return new QuaternionD(vector.x, vector.y, vector.z, 0);
  }

  static angularVelocityIsZero(omega: Vector3d): boolean {
    return omega.x === 0 && omega.y === 0 && omega.z === 0;
  }

  get sqrMagnitude(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  get magnitude(): number {
    return Math.sqrt(this.sqrMagnitude);
  }

  get conjugate(): QuaternionD {
    return new QuaternionD(-this.x, -this.y, -this.z, this.w);
  }

  get inverse(): QuaternionD {
    const n = this.sqrMagnitude;
    if (!(n > 0)) return QuaternionD.identity;
    const inv = 1 / n;
    return new QuaternionD(-this.x * inv, -this.y * inv, -this.z * inv, this.w * inv);
  }

  get normalized(): QuaternionD {
    const mag = this.magnitude;
    if (!(mag > 0)) return QuaternionD.identity;
    return this.scale(1 / mag);
  }

  normalize(): QuaternionD {
    return this.normalized;
  }

  add(other: QuaternionD): QuaternionD {
    return new QuaternionD(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
  }

  sub(other: QuaternionD): QuaternionD {
    return new QuaternionD(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w);
  }

  scale(scalar: number): QuaternionD {
    return new QuaternionD(this.x * scalar, this.y * scalar, this.z * scalar, this.w * scalar);
  }

  /** Hamilton product. this ⊗ other. */
  multiply(other: QuaternionD): QuaternionD {
    return new QuaternionD(
      this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
      this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
      this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
      this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z,
    );
  }

  dot(other: QuaternionD): number {
    return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w;
  }

  /** Body-frame vector into the inertial frame. */
  rotate(body: Vector3d): Vector3d {
    const rotated = this.multiply(QuaternionD.pure(body)).multiply(this.conjugate);
    return new Vector3d(rotated.x, rotated.y, rotated.z);
  }

  static fromAxisAngle(axis: Vector3d, angleRad: number): QuaternionD {
    const unit = axis.normalized;
    const half = angleRad * 0.5;
    const s = Math.sin(half);
    return new QuaternionD(unit.x * s, unit.y * s, unit.z * s, Math.cos(half));
  }

  /**
   * Rotation angle of `to` relative to `from`, radians in [0, 2π).
   * Identical component values return 0.
   */
  static rotationAngleBetween(from: QuaternionD, to: QuaternionD): number {
    if (from.x === to.x && from.y === to.y && from.z === to.z && from.w === to.w) return 0;
    const rel = from.inverse.multiply(to).normalized;
    const v = Math.hypot(rel.x, rel.y, rel.z);
    return 2 * Math.atan2(v, rel.w);
  }

  static derivative(attitude: QuaternionD, omegaBody: Vector3d): QuaternionD {
    return attitude.multiply(QuaternionD.pure(omegaBody)).scale(0.5);
  }

  /**
   * One classical RK4 step of dq/dt = 0.5 * q ⊗ ω, then renormalize.
   * Identically zero ω returns `q0` unchanged.
   */
  static integrateRk4(q0: QuaternionD, omegaBody: Vector3d, dt: number): QuaternionD {
    if (QuaternionD.angularVelocityIsZero(omegaBody)) return q0;
    if (!(dt > 0)) return q0;
    const k1 = QuaternionD.derivative(q0, omegaBody);
    const k2 = QuaternionD.derivative(q0.add(k1.scale(dt * 0.5)), omegaBody);
    const k3 = QuaternionD.derivative(q0.add(k2.scale(dt * 0.5)), omegaBody);
    const k4 = QuaternionD.derivative(q0.add(k3.scale(dt)), omegaBody);
    const sum = k1.add(k2.scale(2)).add(k3.scale(2)).add(k4);
    return q0.add(sum.scale(dt / 6)).normalized;
  }

  /** Constant-rate advance. Renormalizes after every sub-step. Zero ω does not write. */
  static integrateRk4Substeps(q0: QuaternionD, omegaBody: Vector3d, dt: number, substeps: number): QuaternionD {
    if (QuaternionD.angularVelocityIsZero(omegaBody)) return q0;
    if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
    if (!(dt > 0)) return q0;
    const h = dt / substeps;
    let q = q0;
    for (let i = 0; i < substeps; i++) q = QuaternionD.integrateRk4(q, omegaBody, h);
    return q;
  }
}

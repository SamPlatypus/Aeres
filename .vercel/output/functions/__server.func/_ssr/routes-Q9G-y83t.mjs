import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as Copy, n as RotateCcw, r as Download } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { a as CartesianGrid, c as Tooltip, i as Line, n as YAxis, o as ReferenceLine, r as XAxis, s as ResponsiveContainer, t as LineChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Q9G-y83t.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function compactTick(value) {
	if (!Number.isFinite(value)) return "";
	if (Math.abs(value) >= 100) return Math.round(value).toString();
	return value.toFixed(value >= 10 ? 1 : 2);
}
function ChartTip({ active, payload, label }) {
	if (!active || !payload || payload.length === 0) return null;
	const t = typeof label === "number" ? label : Number(label);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-1 tabular-nums text-muted",
			children: Number.isFinite(t) ? `t ${t.toFixed(1)} s` : ""
		}), payload.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline justify-between gap-4 tabular-nums",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				style: { color: row.color },
				children: row.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.value === void 0 ? "—" : row.name === "Altitude" ? row.value.toFixed(2) : row.value.toFixed(1) })]
		}, row.name))]
	});
}
function timeAxis(data) {
	const last = data.length > 0 ? data[data.length - 1].t : 90;
	if (last <= 90) return {
		end: 90,
		ticks: [
			0,
			30,
			60,
			90
		]
	};
	if (last <= 120) return {
		end: 120,
		ticks: [
			0,
			30,
			60,
			90,
			120
		]
	};
	if (last <= 300) {
		const end = last;
		return {
			end,
			ticks: [
				0,
				60,
				120,
				180,
				240,
				300
			].filter((tick) => tick <= end + 1e-6)
		};
	}
	const step = last > 1200 ? 240 : 120;
	const ticks = [];
	for (let tick = 0; tick < last - .001; tick += step) ticks.push(tick);
	const endTick = Math.round(last);
	if (ticks[ticks.length - 1] !== endTick) ticks.push(endTick);
	return {
		end: last,
		ticks
	};
}
function BurnChart({ data, timeS }) {
	const axis = timeAxis(data);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-52 w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
				data,
				margin: {
					top: 8,
					right: 4,
					left: 0,
					bottom: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
						stroke: "var(--color-border)",
						strokeDasharray: "3 3",
						vertical: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "t",
						type: "number",
						domain: [0, axis.end],
						ticks: axis.ticks,
						tickFormatter: (value) => `${value}`,
						stroke: "var(--color-border)",
						tick: {
							fill: "var(--color-muted)",
							fontSize: 11,
							fontFamily: "IBM Plex Mono, ui-monospace, monospace"
						},
						tickLine: false,
						axisLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						yAxisId: "alt",
						width: 44,
						tickFormatter: compactTick,
						stroke: "var(--color-border)",
						tick: {
							fill: "var(--color-primary)",
							fontSize: 11,
							fontFamily: "IBM Plex Mono, ui-monospace, monospace"
						},
						tickLine: false,
						axisLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						yAxisId: "spd",
						orientation: "right",
						width: 48,
						tickFormatter: compactTick,
						stroke: "var(--color-border)",
						tick: {
							fill: "var(--color-fg)",
							fontSize: 11,
							fontFamily: "IBM Plex Mono, ui-monospace, monospace"
						},
						tickLine: false,
						axisLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTip, {}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
						yAxisId: "alt",
						x: timeS,
						stroke: "var(--color-primary)",
						strokeDasharray: "3 3"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						yAxisId: "alt",
						type: "monotone",
						dataKey: "altKm",
						name: "Altitude",
						stroke: "var(--color-primary)",
						strokeWidth: 2,
						dot: false,
						isAnimationActive: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						yAxisId: "spd",
						type: "monotone",
						dataKey: "speed",
						name: "Speed",
						stroke: "var(--color-fg)",
						strokeWidth: 1.5,
						dot: false,
						isAnimationActive: false
					})
				]
			})
		})
	});
}
/** Standard gravity. Converts Isp to exhaust velocity. Not local gravitational acceleration. */
var G0_MPS2 = 9.80665;
var DRY_MASS_KG = 12e4;
var INITIAL_PROPELLANT_KG = 12e5;
var MAX_VACUUM_THRUST_N = 15e6;
var DRAG_CD = .5;
var EARTH_MU_M3_S2 = 3986004418e5;
var EARTH_RADIUS_M = 6371e3;
var EARTH_RHO0_KG_M3 = 1.225;
var EARTH_SCALE_HEIGHT_M = 8500;
/** Earth J2. Stored for later passes. The Pass 1 verification leaves it off. */
var EARTH_J2 = .00108262668;
var MARS_MU_M3_S2 = 4282837e7;
var MARS_RADIUS_M = 3389500;
var MARS_RHO0_KG_M3 = .02;
var MARS_SCALE_HEIGHT_M = 11100;
var MARS_J2 = .00196045;
/** Mars entry interface. Used only when that start is selected. */
var MARS_ENTRY_ALTITUDE_M = 125e3;
var MARS_ENTRY_SPEED_MPS = 6e3;
var MARS_ENTRY_PROPELLANT_KG = 5e4;
/** Open-loop terminal sequence. Used only when that mode is armed on a Mars entry. */
var TERMINAL_TRIGGER_ALTITUDE_M = 3e3;
var TERMINAL_FLIP_THROTTLE = .6;
var TERMINAL_LANDING_THROTTLE = .6;
var TERMINAL_EARLY_ALTITUDE_M = 5e3;
var TERMINAL_MAX_TIME_S = 2400;
/** seconds. Rate damping on body ωz. */
var ATTITUDE_KD = 1.5;
/** Nozzle stop. ±5°. */
var GIMBAL_LIMIT_RAD = 5 * Math.PI / 180;
/**
* Pitch about body +Z. The quaternion is canonicalized so w ≥ 0, then
* θ = 2 atan2(q.z, q.w). Identity is exactly 0.
*/
function pitchAngleRad(attitude) {
	let z = attitude.z;
	let w = attitude.w;
	if (w < 0) {
		z = -z;
		w = -w;
	}
	return 2 * Math.atan2(z, w);
}
/** θ − θ_target. Target defaults to inertial +Y. */
function pitchErrorRad(attitude, targetRad = 0) {
	return pitchAngleRad(attitude) - targetRad;
}
/**
* Signed angle of local up about +Z, in the same convention as pitchAngleRad.
* On the +Y axis this is exactly 0.
*/
function verticalTargetRad(position) {
	const radius = Math.hypot(position.x, position.y, position.z);
	if (!(radius > 0)) return 0;
	return Math.atan2(-position.x / radius, position.y / radius);
}
/** Signed pitch of body +Y relative to local vertical. */
function verticalPitchErrorRad(attitude, position) {
	return pitchErrorRad(attitude, verticalTargetRad(position));
}
/**
* δ = −(Kp θ_err + Kd ωz), clamped to ±5°.
* A positive pitch error commands a negative gimbal.
* A zero error and zero rate return exactly 0, not −0.
*/
function gimbalCommandRad(attitude, omegaZ, targetRad = 0) {
	const delta = -(1 * pitchErrorRad(attitude, targetRad) + ATTITUDE_KD * omegaZ);
	if (delta > GIMBAL_LIMIT_RAD) return GIMBAL_LIMIT_RAD;
	if (delta < -GIMBAL_LIMIT_RAD) return -GIMBAL_LIMIT_RAD;
	if (delta === 0) return 0;
	return delta;
}
/**
* Deflection the nozzle actually holds.
* Controller off returns the open-loop gimbal, which is the prior-pass command.
* Controller on replaces that command with the PD law.
*/
function effectiveGimbalRad(state) {
	if (!state.controllerEnabled) return state.gimbalRad;
	return gimbalCommandRad(state.attitude, state.angularVelocityBody.z, state.pitchTargetRad);
}
/** Immutable double-precision 3-vector. IEEE-754 binary64, no single-precision path. */
var Vector3d = class Vector3d {
	static zero = new Vector3d(0, 0, 0);
	static up = new Vector3d(0, 1, 0);
	x;
	y;
	z;
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	add(other) {
		return new Vector3d(this.x + other.x, this.y + other.y, this.z + other.z);
	}
	sub(other) {
		return new Vector3d(this.x - other.x, this.y - other.y, this.z - other.z);
	}
	scale(scalar) {
		return new Vector3d(this.x * scalar, this.y * scalar, this.z * scalar);
	}
	dot(other) {
		return this.x * other.x + this.y * other.y + this.z * other.z;
	}
	cross(other) {
		return new Vector3d(this.y * other.z - this.z * other.y, this.z * other.x - this.x * other.z, this.x * other.y - this.y * other.x);
	}
	get sqrMagnitude() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}
	get magnitude() {
		return Math.sqrt(this.sqrMagnitude);
	}
	get normalized() {
		const mag = this.magnitude;
		if (!(mag > 0)) return Vector3d.zero;
		return this.scale(1 / mag);
	}
	/** Immutable counterpart of the mutating C# Normalize(). */
	normalize() {
		return this.normalized;
	}
};
/**
* Hamilton quaternion. Scalar is w. Vector part is x, y, z.
* Body-to-inertial: v_i = q ⊗ v_b ⊗ q*.
* Kinematics: dq/dt = 0.5 * q ⊗ ω_body.
*/
var QuaternionD = class QuaternionD {
	static identity = new QuaternionD(0, 0, 0, 1);
	static zero = new QuaternionD(0, 0, 0, 0);
	x;
	y;
	z;
	w;
	constructor(x, y, z, w) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}
	static pure(vector) {
		return new QuaternionD(vector.x, vector.y, vector.z, 0);
	}
	static angularVelocityIsZero(omega) {
		return omega.x === 0 && omega.y === 0 && omega.z === 0;
	}
	get sqrMagnitude() {
		return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
	}
	get magnitude() {
		return Math.sqrt(this.sqrMagnitude);
	}
	get conjugate() {
		return new QuaternionD(-this.x, -this.y, -this.z, this.w);
	}
	get inverse() {
		const n = this.sqrMagnitude;
		if (!(n > 0)) return QuaternionD.identity;
		const inv = 1 / n;
		return new QuaternionD(-this.x * inv, -this.y * inv, -this.z * inv, this.w * inv);
	}
	get normalized() {
		const mag = this.magnitude;
		if (!(mag > 0)) return QuaternionD.identity;
		return this.scale(1 / mag);
	}
	normalize() {
		return this.normalized;
	}
	add(other) {
		return new QuaternionD(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
	}
	sub(other) {
		return new QuaternionD(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w);
	}
	scale(scalar) {
		return new QuaternionD(this.x * scalar, this.y * scalar, this.z * scalar, this.w * scalar);
	}
	/** Hamilton product. this ⊗ other. */
	multiply(other) {
		return new QuaternionD(this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y, this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x, this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w, this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z);
	}
	dot(other) {
		return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w;
	}
	/** Body-frame vector into the inertial frame. */
	rotate(body) {
		const rotated = this.multiply(QuaternionD.pure(body)).multiply(this.conjugate);
		return new Vector3d(rotated.x, rotated.y, rotated.z);
	}
	static fromAxisAngle(axis, angleRad) {
		const unit = axis.normalized;
		const half = angleRad * .5;
		const s = Math.sin(half);
		return new QuaternionD(unit.x * s, unit.y * s, unit.z * s, Math.cos(half));
	}
	/**
	* Rotation angle of `to` relative to `from`, radians in [0, 2π).
	* Identical component values return 0.
	*/
	static rotationAngleBetween(from, to) {
		if (from.x === to.x && from.y === to.y && from.z === to.z && from.w === to.w) return 0;
		const rel = from.inverse.multiply(to).normalized;
		const v = Math.hypot(rel.x, rel.y, rel.z);
		return 2 * Math.atan2(v, rel.w);
	}
	static derivative(attitude, omegaBody) {
		return attitude.multiply(QuaternionD.pure(omegaBody)).scale(.5);
	}
	/**
	* One classical RK4 step of dq/dt = 0.5 * q ⊗ ω, then renormalize.
	* Identically zero ω returns `q0` unchanged.
	*/
	static integrateRk4(q0, omegaBody, dt) {
		if (QuaternionD.angularVelocityIsZero(omegaBody)) return q0;
		if (!(dt > 0)) return q0;
		const k1 = QuaternionD.derivative(q0, omegaBody);
		const k2 = QuaternionD.derivative(q0.add(k1.scale(dt * .5)), omegaBody);
		const k3 = QuaternionD.derivative(q0.add(k2.scale(dt * .5)), omegaBody);
		const k4 = QuaternionD.derivative(q0.add(k3.scale(dt)), omegaBody);
		const sum = k1.add(k2.scale(2)).add(k3.scale(2)).add(k4);
		return q0.add(sum.scale(dt / 6)).normalized;
	}
	/** Constant-rate advance. Renormalizes after every sub-step. Zero ω does not write. */
	static integrateRk4Substeps(q0, omegaBody, dt, substeps) {
		if (QuaternionD.angularVelocityIsZero(omegaBody)) return q0;
		if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
		if (!(dt > 0)) return q0;
		const h = dt / substeps;
		let q = q0;
		for (let i = 0; i < substeps; i++) q = QuaternionD.integrateRk4(q, omegaBody, h);
		return q;
	}
};
var CYLINDER_RADIUS_M = 4.5;
/**
* Principal inertia of a uniform cylinder at the current mass.
* Geometry is fixed. Density scales with mass, so every moment scales with mass
* and the ratios do not. Iyy = ½ m R². Ixx = Izz = ¼ m R² + ¹⁄₁₂ m H².
*/
function principalMoments(massKg) {
	const r2 = CYLINDER_RADIUS_M * CYLINDER_RADIUS_M;
	const axial = .5 * massKg * r2;
	const transverse = massKg * 213.39583333333334;
	return {
		ixx: transverse,
		iyy: axial,
		izz: transverse
	};
}
/** Euler rate. I ω̇ + ω × (I ω) = M. Omit the moment for the torque-free Pass 10 path. */
function eulerRate(omega, inertia, moment) {
	const wx = omega.x;
	const wy = omega.y;
	const wz = omega.z;
	const x = (inertia.iyy - inertia.izz) / inertia.ixx * wy * wz;
	const y = (inertia.izz - inertia.ixx) / inertia.iyy * wz * wx;
	const z = (inertia.ixx - inertia.iyy) / inertia.izz * wx * wy;
	if (moment === void 0 || moment.x === 0 && moment.y === 0 && moment.z === 0) return new Vector3d(x, y, z);
	return new Vector3d(x + moment.x / inertia.ixx, y + moment.y / inertia.iyy, z + moment.z / inertia.izz);
}
function bodyAngularMomentum(omega, inertia) {
	return new Vector3d(inertia.ixx * omega.x, inertia.iyy * omega.y, inertia.izz * omega.z);
}
/** Inertial angular momentum. Rotation preserves the magnitude. */
function inertialAngularMomentum(attitude, omega, massKg) {
	return attitude.rotate(bodyAngularMomentum(omega, principalMoments(massKg)));
}
/**
* Body-frame thrust unit. A positive gimbal deflects thrust from +Y toward +X.
* Zero is exactly +Y, so the force lies on the offset and the moment is zero.
*/
function bodyThrustDirection(gimbalRad) {
	if (gimbalRad === 0) return Vector3d.up;
	return new Vector3d(Math.sin(gimbalRad), Math.cos(gimbalRad), 0);
}
/**
* Moment of a gimbaled thrust about the CoM.
* F = T (sin δ, cos δ, 0) at r = (0, −d, 0), so M = (0, 0, d · T · sin δ).
* Zero gimbal or zero thrust returns the zero vector.
*/
function gimbalMoment(thrustN, gimbalRad) {
	if (gimbalRad === 0 || !(thrustN > 0)) return Vector3d.zero;
	return new Vector3d(0, 0, 25 * thrustN * Math.sin(gimbalRad));
}
/**
* One classical RK4 step of Euler plus dq/dt = ½ q ⊗ ω.
* Inertia is frozen across the step at `massKg`. The moment is body-frame and constant.
* Identically zero ω and zero moment return the same objects and do not read the mass.
* A principal-axis rate with zero moment has a zero Euler derivative, so ω is unchanged
* and the quaternion step matches QuaternionD.integrateRk4.
*/
function integrateEulerRk4(attitude, omega, massKg, dt, moment) {
	const torque = moment !== void 0 && (moment.x !== 0 || moment.y !== 0 || moment.z !== 0);
	if (!torque && QuaternionD.angularVelocityIsZero(omega) || !(dt > 0) || !(massKg > 0)) return {
		attitude,
		omega
	};
	const inertia = principalMoments(massKg);
	const rate = (w) => torque ? eulerRate(w, inertia, moment) : eulerRate(w, inertia);
	const k1w = rate(omega);
	const k1q = QuaternionD.derivative(attitude, omega);
	const w2 = omega.add(k1w.scale(dt * .5));
	const q2 = attitude.add(k1q.scale(dt * .5));
	const k2w = rate(w2);
	const k2q = QuaternionD.derivative(q2, w2);
	const w3 = omega.add(k2w.scale(dt * .5));
	const q3 = attitude.add(k2q.scale(dt * .5));
	const k3w = rate(w3);
	const k3q = QuaternionD.derivative(q3, w3);
	const w4 = omega.add(k3w.scale(dt));
	const q4 = attitude.add(k3q.scale(dt));
	const k4w = rate(w4);
	const k4q = QuaternionD.derivative(q4, w4);
	const scale = dt / 6;
	return {
		attitude: attitude.add(k1q.add(k2q.scale(2)).add(k3q.scale(2)).add(k4q).scale(scale)).normalized,
		omega: omega.add(k1w.add(k2w.scale(2)).add(k3w.scale(2)).add(k4w).scale(scale))
	};
}
/** Same sub-step split as the translational RK4. Zero ω does not write. */
function integrateEulerSubsteps(attitude, omega, massKg, dt, substeps) {
	if (QuaternionD.angularVelocityIsZero(omega)) return {
		attitude,
		omega
	};
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	if (!(dt > 0)) return {
		attitude,
		omega
	};
	const h = dt / substeps;
	let q = attitude;
	let w = omega;
	for (let i = 0; i < substeps; i++) {
		const step = integrateEulerRk4(q, w, massKg, h);
		q = step.attitude;
		w = step.omega;
	}
	return {
		attitude: q,
		omega: w
	};
}
/**
* Center of pressure, aft of the geometric center on body −Y.
* H/4 = 12.5 m. A lateral force here restores a positive angle of attack.
*/
var COP_AXIAL_OFFSET_M = 50 / 4;
/** Same reference area as the axial drag model. */
var AERO_REFERENCE_AREA_M2 = 60;
/** Inertial velocity expressed in the body frame. v_b = q* ⊗ v_i ⊗ q. */
function velocityBody(attitude, velocityInertial) {
	return attitude.conjugate.rotate(velocityInertial);
}
/**
* Signed angle of attack in the body XY plane.
* α = atan2(v_x, v_y). Zero in-plane velocity is exactly 0.
*/
function angleOfAttackRad(velocityBodyFrame) {
	if (velocityBodyFrame.x === 0 && velocityBodyFrame.y === 0) return 0;
	return Math.atan2(velocityBodyFrame.x, velocityBodyFrame.y);
}
/**
* sin α from the body-frame components. v_x = 0 is exactly 0, including when
* the nose is anti-parallel to the velocity (atan2 would return π and sin(π) is not a clean 0).
*/
function sinAngleOfAttack(velocityBodyFrame) {
	if (velocityBodyFrame.x === 0) return 0;
	const lateral = Math.hypot(velocityBodyFrame.x, velocityBodyFrame.y);
	if (!(lateral > 0)) return 0;
	return velocityBodyFrame.x / lateral;
}
/** Lateral aerodynamic force along body +X. Signed with sin α. */
function normalForceN(densityKgM3, speedMps, sinAlpha) {
	if (!(densityKgM3 > 0) || !(speedMps > 0) || sinAlpha === 0) return 0;
	const v2 = speedMps * speedMps;
	return .5 * densityKgM3 * v2 * AERO_REFERENCE_AREA_M2 * sinAlpha;
}
/**
* Aerodynamic moment about the CoM.
* F = (F_normal, 0, 0), r_cop = (0, −H/4, 0).
* M_z = r_cop.y · F_x = −(H/4) · ½ ρ |v|² S sin α.
* That sign is restoring for dq/dt = ½ q ⊗ ω: a positive α produces M_z < 0.
* Vacuum, zero speed, and zero α return the shared zero vector.
*/
function aerodynamicMoment(attitude, velocityInertial, densityKgM3) {
	if (!(densityKgM3 > 0)) return Vector3d.zero;
	const speed = velocityInertial.magnitude;
	if (!(speed > 0)) return Vector3d.zero;
	const sinAlpha = sinAngleOfAttack(velocityBody(attitude, velocityInertial));
	if (sinAlpha === 0) return Vector3d.zero;
	const mz = -COP_AXIAL_OFFSET_M * normalForceN(densityKgM3, speed, sinAlpha);
	if (mz === 0) return Vector3d.zero;
	return new Vector3d(0, 0, mz);
}
/** Verification cutoff. 60 s of thrust, then ballistic coast. */
var CUTOFF_AT_60_S = {
	tCutoffS: 60,
	propellantRemainingKg: null
};
/** 1 while the engine is commanded on, 0 at and after cutoff. */
function commandThrottle(timeS, propellantKg, cutoff) {
	if (cutoff.tCutoffS !== null && !(timeS < cutoff.tCutoffS)) return 0;
	if (cutoff.propellantRemainingKg !== null && !(propellantKg > cutoff.propellantRemainingKg)) return 0;
	return 1;
}
/**
* Specific mechanical energy, m²/s².
* ε = v²/2 − μ/r when the point-mass field is active. Kinetic only when gravity is off.
*/
function specificMechanicalEnergyM2S2(position, velocity, muM3S2) {
	const kinetic = .5 * velocity.sqrMagnitude;
	if (!(muM3S2 > 0)) return kinetic;
	const radius = position.magnitude;
	if (!(radius > 0)) return kinetic;
	return kinetic - muM3S2 / radius;
}
var DEG_TO_RAD = Math.PI / 180;
var RAD_TO_DEG = 180 / Math.PI;
var PURE_VERTICAL_PROGRAM = {
	tVerticalS: 0,
	pitchRateDegPerS: 0,
	holdPitchDeg: null
};
/** Verification pitch-over: 20 s vertical, then 1.0 deg/s toward horizontal. */
var DEFAULT_PITCH_PROGRAM = {
	tVerticalS: 20,
	pitchRateDegPerS: 1,
	holdPitchDeg: null
};
/** Signed degrees from inertial +Y toward inertial +X. Zero at and before tVertical. */
function pitchAngleDeg(timeS, program) {
	if (!(timeS > program.tVerticalS)) return 0;
	if (program.holdPitchDeg !== null) return program.holdPitchDeg;
	return program.pitchRateDegPerS * (timeS - program.tVerticalS);
}
/** Unit thrust direction. Exactly Vector3d.up when the commanded angle is 0. */
function thrustDirectionAt(timeS, program) {
	const deg = pitchAngleDeg(timeS, program);
	if (deg === 0) return Vector3d.up;
	const rad = deg * DEG_TO_RAD;
	return new Vector3d(Math.sin(rad), Math.cos(rad), 0);
}
/** Speed perpendicular to the radius vector. Zero on a radial trajectory. */
function horizontalSpeedMps(position, velocity) {
	const radius = position.magnitude;
	if (!(radius > 0)) return 0;
	const radial = velocity.dot(position) / radius;
	const radialVelocity = position.scale(radial / radius);
	return velocity.sub(radialVelocity).magnitude;
}
/**
* Flight-path angle from the local horizontal, degrees.
* +90 is radially outward. At rest this is reported as 90, matching the initial vertical.
*/
function flightPathAngleDeg(position, velocity) {
	const radius = position.magnitude;
	const speed = velocity.magnitude;
	if (!(radius > 0) || !(speed > 0)) return 90;
	const radial = velocity.dot(position) / radius;
	const horizontalSq = speed * speed - radial * radial;
	return Math.atan2(radial, Math.sqrt(horizontalSq > 0 ? horizontalSq : 0)) * RAD_TO_DEG;
}
function createEarthEnvironment(options) {
	return {
		name: "Earth",
		muM3S2: EARTH_MU_M3_S2,
		equatorialRadiusM: EARTH_RADIUS_M,
		seaLevelDensityKgM3: EARTH_RHO0_KG_M3,
		scaleHeightM: EARTH_SCALE_HEIGHT_M,
		j2: options?.includeJ2 ? EARTH_J2 : 0,
		speedOfSoundMps: 340,
		gravityEnabled: options?.gravityEnabled ?? true,
		atmosphereEnabled: options?.atmosphereEnabled ?? true
	};
}
function createMarsEnvironment(options) {
	return {
		name: "Mars",
		muM3S2: MARS_MU_M3_S2,
		equatorialRadiusM: MARS_RADIUS_M,
		seaLevelDensityKgM3: MARS_RHO0_KG_M3,
		scaleHeightM: MARS_SCALE_HEIGHT_M,
		j2: options?.includeJ2 ? MARS_J2 : 0,
		speedOfSoundMps: 240,
		gravityEnabled: options?.gravityEnabled ?? true,
		atmosphereEnabled: options?.atmosphereEnabled ?? true
	};
}
/** Altitude above the spherical surface. Negative inside the body. */
function altitudeM(env, position) {
	return position.magnitude - env.equatorialRadiusM;
}
/**
* Exponential atmosphere ρ = ρ0 exp(−h / H).
* Height is clamped at zero so a numerical dip under the surface does not blow the density up.
* Disabled atmosphere returns 0.
*/
function atmosphericDensityKgM3(env, position) {
	if (!env.atmosphereEnabled) return 0;
	const height = Math.max(0, altitudeM(env, position));
	return env.seaLevelDensityKgM3 * Math.exp(-height / env.scaleHeightM);
}
/**
* Point-mass acceleration −μ r / |r|³, plus the J2 zonal term when j2 ≠ 0.
* a_J2 = −(3/2) J2 μ Re² / r⁵ · [(1 − 5 z²/r²) r + 2 z z-hat]
* Returns the zero vector when gravity is disabled or the position is the origin.
*/
function gravitationalAcceleration(env, position) {
	if (!env.gravityEnabled) return Vector3d.zero;
	const r2 = position.sqrMagnitude;
	const r = Math.sqrt(r2);
	if (!(r > 0)) return Vector3d.zero;
	const r3 = r2 * r;
	let accel = position.scale(-env.muM3S2 / r3);
	if (env.j2 !== 0) {
		const fiveZ2OverR2 = 5 * (position.z * position.z) / r2;
		const factor = -1.5 * env.j2 * env.muM3S2 * env.equatorialRadiusM * env.equatorialRadiusM / (r3 * r2);
		accel = accel.add(new Vector3d(factor * position.x * (1 - fiveZ2OverR2), factor * position.y * (1 - fiveZ2OverR2), factor * position.z * (3 - fiveZ2OverR2)));
	}
	return accel;
}
function createDefaultPropulsion() {
	return {
		maxVacuumThrustN: MAX_VACUUM_THRUST_N,
		vacuumIspS: 380,
		g0Mps2: G0_MPS2,
		dragCd: DRAG_CD,
		dragAreaM2: 60,
		thrustDirectionInertial: Vector3d.up
	};
}
function exhaustVelocityMps(model) {
	return model.vacuumIspS * model.g0Mps2;
}
/**
* Positive propellant consumption dm/dt = T / (Isp · g0).
* Zero when the throttle is closed or the tanks are empty.
* A tiny negative propellant (RK4 stage probe landing on the burnout boundary)
* is still treated as firing so the stage derivative stays consistent.
*/
function isFiring(throttle, propellantKg) {
	return throttle > 0 && propellantKg > -1e-8;
}
function thrustMagnitudeN(model, throttle, propellantKg) {
	if (!isFiring(throttle, propellantKg)) return 0;
	return (throttle > 1 ? 1 : throttle) * model.maxVacuumThrustN;
}
function massFlowKgS(model, throttle, propellantKg) {
	const thrust = thrustMagnitudeN(model, throttle, propellantKg);
	if (thrust <= 0) return 0;
	return thrust / exhaustVelocityMps(model);
}
/** Ideal rocket equation. Δv = Isp · g0 · ln(m0 / mf). */
function idealRocketDeltaVMps(model, initialMassKg, finalMassKg) {
	if (!(initialMassKg > 0) || !(finalMassKg > 0) || finalMassKg > initialMassKg) throw new Error("Rocket equation requires 0 < mf ≤ m0.");
	return exhaustVelocityMps(model) * Math.log(initialMassKg / finalMassKg);
}
function kinematicRest(angularVelocityBody = Vector3d.zero, gimbalRad = 0, controllerEnabled = true) {
	return {
		attitude: QuaternionD.identity,
		initialAttitude: QuaternionD.identity,
		angularVelocityBody,
		gimbalRad,
		controllerEnabled,
		pitchTargetRad: 0,
		flipHold: false
	};
}
function createSeaLevelState(env, angularVelocityBody = Vector3d.zero, gimbalRad = 0, controllerEnabled = true) {
	return {
		position: new Vector3d(0, env.equatorialRadiusM, 0),
		velocity: Vector3d.zero,
		totalMassKg: DRY_MASS_KG + INITIAL_PROPELLANT_KG,
		propellantMassKg: INITIAL_PROPELLANT_KG,
		thrustIntegratedDeltaVMps: 0,
		...kinematicRest(angularVelocityBody, gimbalRad, controllerEnabled)
	};
}
/** 125 km, 6000 m/s, −12°. Engines are not part of the state. */
var MARS_ENTRY_INTERFACE = {
	altitudeM: MARS_ENTRY_ALTITUDE_M,
	speedMps: MARS_ENTRY_SPEED_MPS,
	flightPathDeg: -12,
	propellantKg: MARS_ENTRY_PROPELLANT_KG
};
/** Same object as the verified interface when the three knobs are at their defaults. */
function marsEntryOrDefault(speedMps, propellantKg, flightPathDeg) {
	if (speedMps === 6e3 && propellantKg === 5e4 && flightPathDeg === -12) return MARS_ENTRY_INTERFACE;
	return {
		altitudeM: MARS_ENTRY_ALTITUDE_M,
		speedMps,
		flightPathDeg,
		propellantKg
	};
}
/**
* Inertial entry state on the active body.
* Position is along +Y at R + h. Velocity is in the XY plane.
* Flight-path angle is from the local horizontal, negative downward.
* Attitude starts at identity unless a body rate is supplied; the quaternion stays identity.
*/
function createEntryState(env, entry = MARS_ENTRY_INTERFACE, angularVelocityBody = Vector3d.zero, gimbalRad = 0, controllerEnabled = true) {
	const radius = env.equatorialRadiusM + entry.altitudeM;
	const gamma = entry.flightPathDeg * Math.PI / 180;
	return {
		position: new Vector3d(0, radius, 0),
		velocity: new Vector3d(entry.speedMps * Math.cos(gamma), entry.speedMps * Math.sin(gamma), 0),
		totalMassKg: DRY_MASS_KG + entry.propellantKg,
		propellantMassKg: entry.propellantKg,
		thrustIntegratedDeltaVMps: 0,
		...kinematicRest(angularVelocityBody, gimbalRad, controllerEnabled)
	};
}
function cloneState(state) {
	return {
		position: state.position,
		velocity: state.velocity,
		totalMassKg: state.totalMassKg,
		propellantMassKg: state.propellantMassKg,
		thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps,
		attitude: state.attitude,
		initialAttitude: state.initialAttitude,
		angularVelocityBody: state.angularVelocityBody,
		gimbalRad: state.gimbalRad,
		controllerEnabled: state.controllerEnabled,
		pitchTargetRad: state.pitchTargetRad,
		flipHold: state.flipHold
	};
}
/** Keep attitude and the constant body rate while replacing the translational state. */
function withTranslation(state, position, velocity, propellantMassKg, totalMassKg, thrustIntegratedDeltaVMps) {
	return {
		position,
		velocity,
		propellantMassKg,
		totalMassKg,
		thrustIntegratedDeltaVMps,
		attitude: state.attitude,
		initialAttitude: state.initialAttitude,
		angularVelocityBody: state.angularVelocityBody,
		gimbalRad: state.gimbalRad,
		controllerEnabled: state.controllerEnabled,
		pitchTargetRad: state.pitchTargetRad,
		flipHold: state.flipHold
	};
}
function massFromPropellant(propellantKg) {
	return DRY_MASS_KG + Math.max(propellantKg, 0);
}
/**
* Translational forces at a state.
* a = g(r) + T/m + D/m
* D = −v̂ · (½ ρ v² Cd A), ρ = ρ0 exp(−h/H), no wind, non-rotating atmosphere.
*/
function evaluateForces(position, velocity, propellantKg, env, propulsion, throttle, thrustDirection) {
	const massKg = massFromPropellant(propellantKg);
	const height = altitudeM(env, position);
	const gravityAccel = gravitationalAcceleration(env, position);
	const density = atmosphericDensityKgM3(env, position);
	const speed = velocity.magnitude;
	const dynamicPressurePa = .5 * density * speed * speed;
	let dragN = 0;
	let dragAccel = Vector3d.zero;
	if (speed > 0 && density > 0 && propulsion.dragCd > 0 && propulsion.dragAreaM2 > 0) {
		dragN = dynamicPressurePa * propulsion.dragCd * propulsion.dragAreaM2;
		dragAccel = velocity.scale(-dragN / (speed * massKg));
	}
	const thrustN = thrustMagnitudeN(propulsion, throttle, propellantKg);
	const thrustAccel = (thrustDirection ?? propulsion.thrustDirectionInertial).scale(thrustN / massKg);
	const acceleration = gravityAccel.add(thrustAccel).add(dragAccel);
	return {
		altitudeM: height,
		massKg,
		acceleration,
		accelerationMagnitudeMps2: acceleration.magnitude,
		thrustN,
		thrustAccelMps2: massKg > 0 ? thrustN / massKg : 0,
		dragN,
		dragAccel,
		gravityMps2: gravityAccel.magnitude,
		gravityAccel,
		densityKgM3: density,
		dynamicPressurePa,
		massFlowKgS: massFlowKgS(propulsion, throttle, propellantKg)
	};
}
function derivative(state, env, propulsion, throttle, thrustDirection) {
	const force = evaluateForces(state.position, state.velocity, state.propellantMassKg, env, propulsion, throttle, thrustDirection);
	return {
		dr: state.velocity,
		dv: force.acceleration,
		dPropellant: -force.massFlowKgS,
		dThrustDeltaV: force.thrustAccelMps2
	};
}
function advance(state, deriv, h) {
	const propellant = state.propellantMassKg + deriv.dPropellant * h;
	return {
		position: state.position.add(deriv.dr.scale(h)),
		velocity: state.velocity.add(deriv.dv.scale(h)),
		propellantMassKg: propellant,
		totalMassKg: massFromPropellant(propellant),
		thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps + deriv.dThrustDeltaV * h,
		attitude: state.attitude,
		initialAttitude: state.initialAttitude,
		angularVelocityBody: state.angularVelocityBody,
		gimbalRad: state.gimbalRad,
		controllerEnabled: state.controllerEnabled,
		pitchTargetRad: state.pitchTargetRad,
		flipHold: state.flipHold
	};
}
function sumDeriv(a, b) {
	return {
		dr: a.dr.add(b.dr),
		dv: a.dv.add(b.dv),
		dPropellant: a.dPropellant + b.dPropellant,
		dThrustDeltaV: a.dThrustDeltaV + b.dThrustDeltaV
	};
}
function scaleDeriv(d, s) {
	return {
		dr: d.dr.scale(s),
		dv: d.dv.scale(s),
		dPropellant: d.dPropellant * s,
		dThrustDeltaV: d.dThrustDeltaV * s
	};
}
function rk4(state, dt, env, propulsion, throttle, thrustDirection) {
	const gimbal = effectiveGimbalRad(state);
	if (gimbal !== 0 && throttle > 0) thrustDirection = state.attitude.rotate(bodyThrustDirection(gimbal));
	const k1 = derivative(state, env, propulsion, throttle, thrustDirection);
	const k2 = derivative(advance(state, k1, dt * .5), env, propulsion, throttle, thrustDirection);
	const k3 = derivative(advance(state, k2, dt * .5), env, propulsion, throttle, thrustDirection);
	const k4 = derivative(advance(state, k3, dt), env, propulsion, throttle, thrustDirection);
	const next = advance(state, scaleDeriv(sumDeriv(k1, sumDeriv(scaleDeriv(k2, 2), sumDeriv(scaleDeriv(k3, 2), k4))), 1 / 6), dt);
	if (next.propellantMassKg < 0) {
		next.propellantMassKg = 0;
		next.totalMassKg = DRY_MASS_KG;
	} else next.totalMassKg = massFromPropellant(next.propellantMassKg);
	const aero = state.flipHold ? Vector3d.zero : aerodynamicMoment(state.attitude, state.velocity, atmosphericDensityKgM3(env, state.position));
	if (!(aero.x !== 0 || aero.y !== 0 || aero.z !== 0)) {
		if (gimbal !== 0) {
			const moment = gimbalMoment(thrustMagnitudeN(propulsion, throttle, next.propellantMassKg), gimbal);
			if (moment.x !== 0 || moment.y !== 0 || moment.z !== 0 || !QuaternionD.angularVelocityIsZero(state.angularVelocityBody)) {
				const rotation = integrateEulerRk4(state.attitude, state.angularVelocityBody, next.totalMassKg, dt, moment);
				next.attitude = rotation.attitude;
				next.angularVelocityBody = rotation.omega;
			}
		} else if (!QuaternionD.angularVelocityIsZero(state.angularVelocityBody)) {
			const rotation = integrateEulerRk4(state.attitude, state.angularVelocityBody, next.totalMassKg, dt);
			next.attitude = rotation.attitude;
			next.angularVelocityBody = rotation.omega;
		}
	} else {
		let moment = aero;
		if (gimbal !== 0) {
			const thrustMoment = gimbalMoment(thrustMagnitudeN(propulsion, throttle, next.propellantMassKg), gimbal);
			moment = new Vector3d(thrustMoment.x + aero.x, thrustMoment.y + aero.y, thrustMoment.z + aero.z);
		}
		const rotation = integrateEulerRk4(state.attitude, state.angularVelocityBody, next.totalMassKg, dt, moment);
		next.attitude = rotation.attitude;
		next.angularVelocityBody = rotation.omega;
	}
	return next;
}
function stepOne(state, dt, env, propulsion, throttle, thrustDirection) {
	if (!(dt > 0)) return state;
	if (state.propellantMassKg <= 0 || !(throttle > 0)) {
		const coast = cloneState(state);
		coast.propellantMassKg = Math.max(0, coast.propellantMassKg);
		coast.totalMassKg = massFromPropellant(coast.propellantMassKg);
		return rk4(coast, dt, env, propulsion, 0, thrustDirection);
	}
	const mdot = massFlowKgS(propulsion, throttle, state.propellantMassKg);
	if (mdot > 0 && state.propellantMassKg < mdot * dt) {
		const dtBurn = state.propellantMassKg / mdot;
		let burned = state;
		if (dtBurn > 0) burned = rk4(state, dtBurn, env, propulsion, throttle, thrustDirection);
		burned.propellantMassKg = 0;
		burned.totalMassKg = DRY_MASS_KG;
		const dtCoast = dt - dtBurn;
		if (dtCoast > 1e-12) return rk4(burned, dtCoast, env, propulsion, 0, thrustDirection);
		return burned;
	}
	return rk4(state, dt, env, propulsion, throttle, thrustDirection);
}
/**
* Advance the vehicle by `dt` seconds using `substeps` equal RK4 sub-steps.
* Attitude and body rate advance on the same sub-steps.
* A zero gimbal and a zero aerodynamic moment leave the thrust line on the body axis, so this
* step is the Pass 10 integrator. A non-zero gimbal holds the thrust vector off +Y in the
* body frame, points the translational thrust along it, and applies M = r × F.
* Aerodynamic moment is added only when density and angle of attack are both non-zero.
* It does not enter the translational force sum. Identically zero ω, zero gimbal, and zero
* aero moment leave the quaternion untouched.
* Mutates nothing: returns the next state.
*/
function stepRk4(state, dt, substeps, env, propulsion, throttle, thrustDirection) {
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const h = dt / substeps;
	let next = state;
	for (let i = 0; i < substeps; i++) next = stepOne(next, h, env, propulsion, isFiring(throttle, next.propellantMassKg) ? throttle : 0, thrustDirection);
	return next;
}
/**
* Torque-free attitude on an analytic coast. Translation is not touched.
* Identically zero ω returns the same state object.
*/
function advanceAttitude(state, dt, substeps) {
	if (QuaternionD.angularVelocityIsZero(state.angularVelocityBody)) return state;
	const rotation = integrateEulerSubsteps(state.attitude, state.angularVelocityBody, state.totalMassKg, dt, substeps);
	return {
		...state,
		attitude: rotation.attitude,
		angularVelocityBody: rotation.omega
	};
}
/**
* Classical elements from an inertial state.
* α = 2/r − v²/μ, a = 1/α, e = |((v×h)/μ) − r̂|.
*/
function keplerElements(position, velocity, muM3S2) {
	const radius = position.magnitude;
	const speedSq = velocity.sqrMagnitude;
	const energy = .5 * speedSq - (muM3S2 > 0 && radius > 0 ? muM3S2 / radius : 0);
	if (!(muM3S2 > 0) || !(radius > 0)) return {
		semiMajorAxisM: Number.POSITIVE_INFINITY,
		eccentricity: 0,
		specificEnergyM2S2: energy,
		alphaPerM: 0
	};
	const alpha = 2 / radius - speedSq / muM3S2;
	const semiMajorAxisM = Math.abs(alpha) < 1e-14 ? Number.POSITIVE_INFINITY : 1 / alpha;
	const h = position.cross(velocity);
	return {
		semiMajorAxisM,
		eccentricity: velocity.cross(h).scale(1 / muM3S2).sub(position.scale(1 / radius)).magnitude,
		specificEnergyM2S2: energy,
		alphaPerM: Math.abs(alpha) < 1e-14 ? 0 : alpha
	};
}
/** Stumpff C(z). Series near zero so a short coast does not cancel. */
function stumpffC(z) {
	if (z > 1e-4) return (1 - Math.cos(Math.sqrt(z))) / z;
	if (z < -1e-4) {
		const s = Math.sqrt(-z);
		return (Math.cosh(s) - 1) / -z;
	}
	return .5 - z / 24 + z * z / 720 - z * z * z / 40320;
}
/** Stumpff S(z). */
function stumpffS(z) {
	if (z > 1e-4) {
		const s = Math.sqrt(z);
		return (s - Math.sin(s)) / (s * s * s);
	}
	if (z < -1e-4) {
		const s = Math.sqrt(-z);
		return (Math.sinh(s) - s) / (s * s * s);
	}
	return 1 / 6 - z / 120 + z * z / 5040 - z * z * z / 362880;
}
/**
* Universal-variable Kepler propagation (Battin / Vallado).
* Ellipse, parabola, and hyperbola. dt = 0 returns the captured state.
* μ ≤ 0 is uniform rectilinear motion: no gravity, no drag.
*/
function propagateKepler(position, velocity, muM3S2, dtS) {
	if (!(dtS !== 0)) return {
		position,
		velocity
	};
	if (!(muM3S2 > 0)) return {
		position: position.add(velocity.scale(dtS)),
		velocity
	};
	const radius = position.magnitude;
	const speedSq = velocity.sqrMagnitude;
	const radialRate = position.dot(velocity);
	const sqrtMu = Math.sqrt(muM3S2);
	const alpha = 2 / radius - speedSq / muM3S2;
	let chi = initialChi(alpha, radius, radialRate, muM3S2, dtS, sqrtMu);
	for (let i = 0; i < 40; i++) {
		const z = alpha * chi * chi;
		const c = stumpffC(z);
		const s = stumpffS(z);
		const residual = radialRate / sqrtMu * chi * chi * c + (1 - alpha * radius) * chi * chi * chi * s + radius * chi - sqrtMu * dtS;
		const derivative = radialRate / sqrtMu * chi * (1 - z * s) + (1 - alpha * radius) * chi * chi * c + radius;
		if (!(Math.abs(derivative) > 0)) break;
		const ratio = residual / derivative;
		chi -= ratio;
		if (Math.abs(ratio) < 1e-12) break;
	}
	const z = alpha * chi * chi;
	const c = stumpffC(z);
	const s = stumpffS(z);
	const f = 1 - chi * chi * c / radius;
	const g = dtS - chi * chi * chi * s / sqrtMu;
	const nextPosition = position.scale(f).add(velocity.scale(g));
	const nextRadius = nextPosition.magnitude;
	const fDot = sqrtMu / (nextRadius * radius) * chi * (z * s - 1);
	const gDot = 1 - chi * chi * c / nextRadius;
	return {
		position: nextPosition,
		velocity: position.scale(fDot).add(velocity.scale(gDot))
	};
}
function initialChi(alpha, radius, radialRate, mu, dt, sqrtMu) {
	if (alpha > 1e-8) return sqrtMu * dt * alpha;
	if (alpha < -1e-8) {
		const semi = 1 / alpha;
		const sqrtNegA = Math.sqrt(-semi);
		const denom = radialRate + Math.sign(dt) * Math.sqrt(-mu * semi) * (1 - radius * alpha);
		const numer = -2 * mu * alpha * dt;
		if (denom !== 0 && numer / denom > 0) return Math.sign(dt) * sqrtNegA * Math.log(numer / denom);
	}
	return sqrtMu * dt / radius;
}
/** Case B. Flip at 3 km, thrust off during the flip, then 60% vertical. */
var DEFAULT_TERMINAL_SEQUENCE = {
	triggerAltitudeM: TERMINAL_TRIGGER_ALTITUDE_M,
	triggerTimeS: null,
	flipDurationS: 8,
	flipThrottle: TERMINAL_FLIP_THROTTLE,
	landingThrottle: TERMINAL_LANDING_THROTTLE,
	manualCutoffS: null
};
/** Case C. Earlier altitude gate and full thrust. Same flip. */
var EARLY_TERMINAL_SEQUENCE = {
	triggerAltitudeM: TERMINAL_EARLY_ALTITUDE_M,
	triggerTimeS: null,
	flipDurationS: 8,
	flipThrottle: TERMINAL_FLIP_THROTTLE,
	landingThrottle: 1,
	manualCutoffS: null
};
function touchdownFlag(verticalMps, horizontalMps) {
	if (Math.abs(verticalMps) <= 2 && horizontalMps <= .5) return "nominal";
	return "RUD";
}
function pitchFromVerticalDeg(direction, position) {
	const radius = position.magnitude;
	if (!(radius > 0) || !(direction.magnitude > 0)) return 0;
	const up = position.scale(1 / radius);
	const cosine = Math.max(-1, Math.min(1, direction.normalized.dot(up)));
	return Math.acos(cosine) * 180 / Math.PI;
}
function inertialPitchFromYDeg(direction) {
	const cosine = Math.max(-1, Math.min(1, direction.normalized.y));
	return Math.acos(cosine) * 180 / Math.PI;
}
function localUp(position) {
	const radius = position.magnitude;
	if (!(radius > 0)) return Vector3d.up;
	return position.scale(1 / radius);
}
/**
* Landing direction. fraction <= 0 returns `up` unchanged so Pass 6 stays the same vector.
* Otherwise normalize((1 - f) * up + f * opposition), with opposition against horizontal velocity.
*/
function landingThrustDirection(up, velocity, fraction) {
	if (!(fraction > 0)) return {
		direction: up,
		pitchFromVerticalDeg: 0
	};
	const f = fraction > 1 ? 1 : fraction;
	const horizontal = velocity.sub(up.scale(velocity.dot(up)));
	const speed = horizontal.magnitude;
	if (!(speed > 0)) return {
		direction: up,
		pitchFromVerticalDeg: 0
	};
	const opposition = horizontal.scale(-1 / speed);
	const direction = up.scale(1 - f).add(opposition.scale(f)).normalized;
	const cosine = Math.max(-1, Math.min(1, direction.dot(up)));
	return {
		direction,
		pitchFromVerticalDeg: Math.acos(cosine) * 180 / Math.PI
	};
}
/**
* Proportional landing fraction. clamp(k * vh / v_ref, 0, max_fraction).
* Not called on the FixedFraction path.
*/
function proportionalHorizontalFraction(config, position, velocity) {
	const gain = config.proportionalGain ?? 1;
	const reference = config.proportionalSpeedRefMps ?? 500;
	let cap = config.maxHorizontalFraction ?? .75;
	if (!(cap > 0)) cap = 0;
	const horizontal = horizontalSpeedMps(position, velocity);
	let fraction = reference > 0 ? gain * horizontal / reference : 0;
	if (!(fraction > 0)) fraction = 0;
	if (fraction > cap) fraction = cap;
	return fraction;
}
/**
* Powered flip onto local vertical, then the landing burn.
* The flip torque is the PD gimbal moment. Landing aim is unchanged.
*/
var TerminalSequence = class {
	config;
	triggerAtS = null;
	aligned = false;
	constructor(config) {
		this.config = config;
	}
	get triggerTimeS() {
		return this.triggerAtS;
	}
	command(timeS, position, velocity, propellantKg, altitudeM, attitude = QuaternionD.identity, omegaZ = 0) {
		const up = localUp(position);
		if (this.triggerAtS === null) {
			const byTime = this.config.triggerTimeS !== null && timeS >= this.config.triggerTimeS;
			const byAltitude = this.config.triggerAltitudeM !== null && altitudeM > 0 && altitudeM <= this.config.triggerAltitudeM;
			if (byTime || byAltitude) this.triggerAtS = timeS;
		}
		if (this.triggerAtS === null) return {
			phase: "Coast",
			throttle: 0,
			direction: up,
			pitchFromVerticalDeg: 0
		};
		if (this.config.manualCutoffS !== null && timeS >= this.config.manualCutoffS || propellantKg <= 0) return {
			phase: "Complete",
			throttle: 0,
			direction: up,
			pitchFromVerticalDeg: 0
		};
		const armed = this.config.flipControllerEnabled !== false;
		if (!this.aligned && armed && timeS > this.triggerAtS) {
			const error = verticalPitchErrorRad(attitude, position);
			if (Math.abs(error) <= GIMBAL_LIMIT_RAD) this.aligned = true;
		}
		if (!this.aligned) {
			const target = verticalTargetRad(position);
			const delta = armed ? gimbalCommandRad(attitude, omegaZ, target) : 0;
			const direction = attitude.rotate(bodyThrustDirection(delta));
			return {
				phase: "Flip",
				throttle: this.config.flipThrottle,
				direction,
				pitchFromVerticalDeg: pitchFromVerticalDeg(direction, position),
				bodyThrust: true
			};
		}
		if (this.config.guidanceMode === "Proportional") {
			const fraction = proportionalHorizontalFraction(this.config, position, velocity);
			const aim = landingThrustDirection(up, velocity, fraction > 1 ? 1 : fraction);
			return {
				phase: "LandingBurn",
				throttle: this.config.landingThrottle,
				direction: aim.direction,
				pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
				horizontalFraction: fraction,
				guidanceMode: "Proportional"
			};
		}
		const fraction = this.config.horizontalFraction;
		if (!(typeof fraction === "number") || !(fraction > 0)) return {
			phase: "LandingBurn",
			throttle: this.config.landingThrottle,
			direction: up,
			pitchFromVerticalDeg: 0
		};
		const clamped = fraction > 1 ? 1 : fraction;
		const aim = landingThrustDirection(up, velocity, clamped);
		return {
			phase: "LandingBurn",
			throttle: this.config.landingThrottle,
			direction: aim.direction,
			pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
			horizontalFraction: clamped
		};
	}
};
function assessImpact(state, peakSpeedMps) {
	const radius = state.position.magnitude;
	const vertical = radius > 0 ? state.velocity.dot(state.position) / radius : 0;
	const horizontal = horizontalSpeedMps(state.position, state.velocity);
	const speed = state.velocity.magnitude;
	return {
		verticalMps: vertical,
		horizontalMps: horizontal,
		speedMps: speed,
		kineticEnergyJ: .5 * state.totalMassKg * speed * speed,
		flag: touchdownFlag(vertical, horizontal),
		peakSpeedMps
	};
}
/**
* Linear segment between two RK4 states, solved so |r| = R.
* u is the fraction of the step. Position is then projected onto the sphere.
*/
function surfaceState(before, after, radiusM) {
	const dp = after.position.sub(before.position);
	const a = dp.sqrMagnitude;
	const b = 2 * before.position.dot(dp);
	const c = before.position.sqrMagnitude - radiusM * radiusM;
	let u = 1;
	if (a > 0) {
		const disc = b * b - 4 * a * c;
		if (disc >= 0) {
			const root = Math.sqrt(disc);
			const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((value) => value >= -1e-9 && value <= 1 + 1e-9);
			if (candidates.length > 0) u = Math.max(0, Math.min(1, Math.min(...candidates)));
		}
	}
	const mix = (start, end) => start + (end - start) * u;
	const position = before.position.add(dp.scale(u));
	const onSurface = position.magnitude > 0 ? position.normalized.scale(radiusM) : new Vector3d(0, radiusM, 0);
	const propellant = Math.max(0, mix(before.propellantMassKg, after.propellantMassKg));
	return {
		u,
		state: {
			position: onSurface,
			velocity: new Vector3d(mix(before.velocity.x, after.velocity.x), mix(before.velocity.y, after.velocity.y), mix(before.velocity.z, after.velocity.z)),
			propellantMassKg: propellant,
			totalMassKg: before.totalMassKg + (after.totalMassKg - before.totalMassKg) * u,
			thrustIntegratedDeltaVMps: mix(before.thrustIntegratedDeltaVMps, after.thrustIntegratedDeltaVMps),
			initialAttitude: before.initialAttitude,
			angularVelocityBody: new Vector3d(mix(before.angularVelocityBody.x, after.angularVelocityBody.x), mix(before.angularVelocityBody.y, after.angularVelocityBody.y), mix(before.angularVelocityBody.z, after.angularVelocityBody.z)),
			gimbalRad: before.gimbalRad,
			controllerEnabled: before.controllerEnabled,
			pitchTargetRad: before.pitchTargetRad,
			flipHold: before.flipHold,
			attitude: before.attitude.x === after.attitude.x && before.attitude.y === after.attitude.y && before.attitude.z === after.attitude.z && before.attitude.w === after.attitude.w ? before.attitude : slerpAttitude(before.attitude, after.attitude, u)
		}
	};
}
function slerpAttitude(from, to, u) {
	let target = to;
	let dot = from.dot(to);
	if (dot < 0) {
		target = new QuaternionD(-to.x, -to.y, -to.z, -to.w);
		dot = -dot;
	}
	if (dot > .9995) return from.add(target.sub(from).scale(u)).normalized;
	const theta = Math.acos(Math.min(1, dot));
	const s = Math.sin(theta);
	const a = Math.sin((1 - u) * theta) / s;
	const b = Math.sin(u * theta) / s;
	return from.scale(a).add(target.scale(b)).normalized;
}
function formatTerminalSuffix(frame) {
	const phase = frame.sequencePhase ?? "Coast";
	const pitch = frame.thrustPitchFromVerticalDeg ?? 0;
	const radial = frame.radialMps ?? 0;
	let line = ` | phase=${phase} | pitchv=${pitch.toFixed(4)} deg | vrad=${radial.toFixed(4)}`;
	if (frame.impactFlag === "nominal" || frame.impactFlag === "RUD") line += ` | impact=${frame.impactFlag} | ke=${(frame.impactKineticEnergyJ ?? 0).toExponential(6)} J | vimp=${(frame.impactSpeedMps ?? 0).toFixed(4)} | vrad_imp=${(frame.impactVerticalMps ?? 0).toFixed(4)} | vhimp=${(frame.impactHorizontalMps ?? 0).toFixed(4)} | vpeak=${(frame.peakSpeedMps ?? 0).toFixed(4)}`;
	const fraction = frame.horizontalFraction ?? 0;
	const burnOrImpact = phase === "LandingBurn" || frame.impactFlag === "nominal" || frame.impactFlag === "RUD";
	if (frame.guidanceMode === "Proportional" && burnOrImpact) line += ` | guide=Proportional | hf=${fraction.toFixed(4)} | herr=${pitch.toFixed(4)} deg`;
	else if (fraction > 0 && burnOrImpact) line += ` | hf=${fraction.toFixed(4)} | herr=${pitch.toFixed(4)} deg`;
	return line;
}
function frameFromForce(timeS, velocity, position, propellantKg, force, thrustPitchDeg, engineState = 1, timeSinceCutoffS = 0, specificEnergyM2S2 = 0, propagationMode = "numerical", semiMajorAxisM = 0, eccentricity = 0, timeSinceElementsS = 0, body = "Earth", speedOfSoundMps = 340) {
	return {
		timeS,
		altitudeM: force.altitudeM,
		speedMps: velocity.magnitude,
		verticalMps: velocity.y,
		accelMps2: force.accelerationMagnitudeMps2,
		propellantKg,
		totalMassKg: force.massKg,
		thrustN: force.thrustN,
		dynamicPressurePa: force.dynamicPressurePa,
		densityKgM3: force.densityKgM3,
		dragN: force.dragN,
		gravityMps2: force.gravityMps2,
		horizontalMps: horizontalSpeedMps(position, velocity),
		flightPathDeg: flightPathAngleDeg(position, velocity),
		thrustPitchDeg,
		radiusM: position.magnitude,
		engineState,
		timeSinceCutoffS,
		specificEnergyM2S2,
		propagationMode,
		semiMajorAxisM,
		eccentricity,
		timeSinceElementsS,
		body,
		mach: speedOfSoundMps > 0 ? velocity.magnitude / speedOfSoundMps : 0,
		quaternionW: 1,
		quaternionX: 0,
		quaternionY: 0,
		quaternionZ: 0,
		angularVelocityRadS: 0,
		omegaBodyX: 0,
		omegaBodyY: 0,
		omegaBodyZ: 0,
		angularMomentumKgM2S: 0,
		angularMomentumInertialX: 0,
		angularMomentumInertialY: 0,
		angularMomentumInertialZ: 0,
		inertiaIxx: 0,
		inertiaIyy: 0,
		inertiaIzz: 0,
		gimbalRad: 0,
		momentX: 0,
		momentY: 0,
		momentZ: 0,
		alphaX: 0,
		alphaY: 0,
		alphaZ: 0,
		angleOfAttackRad: 0,
		aeroMomentZ: 0,
		pitchAngleRad: 0,
		controllerEnabled: false,
		rotationAngleRad: 0
	};
}
function stampAttitude(frame, state) {
	const inertia = principalMoments(state.totalMassKg);
	const angularMomentum = inertialAngularMomentum(state.attitude, state.angularVelocityBody, state.totalMassKg);
	frame.quaternionW = state.attitude.w;
	frame.quaternionX = state.attitude.x;
	frame.quaternionY = state.attitude.y;
	frame.quaternionZ = state.attitude.z;
	frame.angularVelocityRadS = state.angularVelocityBody.magnitude;
	frame.omegaBodyX = state.angularVelocityBody.x;
	frame.omegaBodyY = state.angularVelocityBody.y;
	frame.omegaBodyZ = state.angularVelocityBody.z;
	frame.angularMomentumKgM2S = angularMomentum.magnitude;
	frame.angularMomentumInertialX = angularMomentum.x;
	frame.angularMomentumInertialY = angularMomentum.y;
	frame.angularMomentumInertialZ = angularMomentum.z;
	frame.inertiaIxx = inertia.ixx;
	frame.inertiaIyy = inertia.iyy;
	frame.inertiaIzz = inertia.izz;
	frame.rotationAngleRad = QuaternionD.rotationAngleBetween(state.initialAttitude, state.attitude);
	const aero = aerodynamicMoment(state.attitude, state.velocity, frame.densityKgM3);
	const gimbal = effectiveGimbalRad(state);
	const gimbalTorque = gimbalMoment(frame.thrustN, gimbal);
	const moment = aero.x === 0 && aero.y === 0 && aero.z === 0 ? gimbalTorque : new Vector3d(gimbalTorque.x + aero.x, gimbalTorque.y + aero.y, gimbalTorque.z + aero.z);
	const alpha = eulerRate(state.angularVelocityBody, inertia, moment);
	frame.gimbalRad = gimbal;
	frame.momentX = moment.x;
	frame.momentY = moment.y;
	frame.momentZ = moment.z;
	frame.alphaX = alpha.x;
	frame.alphaY = alpha.y;
	frame.alphaZ = alpha.z;
	frame.angleOfAttackRad = angleOfAttackRad(velocityBody(state.attitude, state.velocity));
	frame.aeroMomentZ = aero.z;
	frame.pitchAngleRad = pitchErrorRad(state.attitude);
	frame.controllerEnabled = state.controllerEnabled;
	return frame;
}
function formatLogLine(frame) {
	return [
		`t=${frame.timeS.toFixed(3)} s`,
		`alt=${frame.altitudeM.toFixed(3)} m`,
		`v=${frame.speedMps.toFixed(4)} m/s`,
		`vy=${frame.verticalMps.toFixed(4)} m/s`,
		`a=${frame.accelMps2.toFixed(6)} m/s^2`,
		`mp=${frame.propellantKg.toFixed(3)} kg`,
		`m=${frame.totalMassKg.toFixed(3)} kg`,
		`T=${frame.thrustN.toFixed(1)} N`,
		`Q=${frame.dynamicPressurePa.toFixed(3)} Pa`,
		`rho=${frame.densityKgM3.toFixed(8)} kg/m^3`,
		`D=${frame.dragN.toFixed(3)} N`,
		`g=${frame.gravityMps2.toFixed(6)} m/s^2`,
		`vh=${frame.horizontalMps.toFixed(4)} m/s`,
		`gamma=${frame.flightPathDeg.toFixed(4)} deg`,
		`pitch=${frame.thrustPitchDeg.toFixed(4)} deg`,
		`r=${frame.radiusM.toFixed(3)} m`,
		`eng=${frame.engineState.toFixed(0)}`,
		`tco=${frame.timeSinceCutoffS.toFixed(3)} s`,
		`eps=${frame.specificEnergyM2S2.toExponential(6)} m^2/s^2`,
		`prop=${frame.propagationMode}`,
		`a=${Number.isFinite(frame.semiMajorAxisM) ? frame.semiMajorAxisM.toFixed(3) : "inf"} m`,
		`e=${frame.eccentricity.toFixed(8)}`,
		`tke=${frame.timeSinceElementsS.toFixed(3)} s`,
		`body=${frame.body}`,
		`M=${frame.mach.toFixed(4)}`,
		`qw=${frame.quaternionW.toFixed(9)}`,
		`qx=${frame.quaternionX.toFixed(9)}`,
		`qy=${frame.quaternionY.toFixed(9)}`,
		`qz=${frame.quaternionZ.toFixed(9)}`,
		`|w|=${frame.angularVelocityRadS.toFixed(6)} rad/s`,
		`theta=${frame.rotationAngleRad.toFixed(9)} rad`,
		`wx=${frame.omegaBodyX.toFixed(9)}`,
		`wy=${frame.omegaBodyY.toFixed(9)}`,
		`wz=${frame.omegaBodyZ.toFixed(9)}`,
		`|L|=${frame.angularMomentumKgM2S.toFixed(6)} kg*m^2/s`,
		`Lix=${frame.angularMomentumInertialX.toFixed(6)}`,
		`Liy=${frame.angularMomentumInertialY.toFixed(6)}`,
		`Liz=${frame.angularMomentumInertialZ.toFixed(6)}`,
		`Ixx=${frame.inertiaIxx.toFixed(3)}`,
		`Iyy=${frame.inertiaIyy.toFixed(3)}`,
		`Izz=${frame.inertiaIzz.toFixed(3)}`,
		`gimbal=${frame.gimbalRad.toFixed(9)} rad`,
		`Mx=${frame.momentX.toFixed(3)}`,
		`My=${frame.momentY.toFixed(3)}`,
		`Mz=${frame.momentZ.toFixed(3)}`,
		`ax=${frame.alphaX.toFixed(9)}`,
		`ay=${frame.alphaY.toFixed(9)}`,
		`az=${frame.alphaZ.toFixed(9)}`,
		`aoa=${frame.angleOfAttackRad.toFixed(9)} rad`,
		`Maero=${frame.aeroMomentZ.toFixed(3)}`,
		`ctrl=${frame.controllerEnabled ? 1 : 0}`,
		`perr=${frame.pitchAngleRad.toFixed(9)} rad`
	].join(" | ");
}
var FRAME_STRIDE = 10;
var VACUUM_AGREEMENT_LIMIT = .001;
function sampleState(state, timeS, env, propulsion, throttle, thrustPitchDeg = 0, thrustDirection = Vector3d.up, timeSinceCutoffS = 0, body = env.name, speedOfSoundMps = env.speedOfSoundMps) {
	const delta = effectiveGimbalRad(state);
	const steered = delta !== 0 && throttle > 0 ? state.attitude.rotate(bodyThrustDirection(delta)) : thrustDirection;
	const force = evaluateForces(state.position, state.velocity, state.propellantMassKg, env, propulsion, throttle, steered);
	const mu = env.gravityEnabled ? env.muM3S2 : 0;
	const pitchDeg = delta !== 0 && throttle > 0 ? Math.atan2(steered.x, steered.y) * 180 / Math.PI : thrustPitchDeg;
	return stampAttitude(frameFromForce(timeS, state.velocity, state.position, state.propellantMassKg, force, pitchDeg, throttle > 0 ? 1 : 0, timeSinceCutoffS, specificMechanicalEnergyM2S2(state.position, state.velocity, mu), "numerical", 0, 0, 0, body, speedOfSoundMps), state);
}
/**
* Headless Pass 1 verification.
* Sea-level Earth, position (0, R, 0), velocity 0, 100% +Y thrust for 90 s.
* Fixed step 0.02 s. Optional RK4 sub-stepping.
* Set disableGravityAndAtmosphere to compare integrated Δv with the rocket equation.
*/
function runVerticalBurn(disableGravityAndAtmosphere, substeps = 1, angularVelocityBody = Vector3d.zero, gimbalRad = 0, controllerEnabled = false, initialAttitude = null) {
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const env = createEarthEnvironment({
		gravityEnabled: !disableGravityAndAtmosphere,
		atmosphereEnabled: !disableGravityAndAtmosphere,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
	if (initialAttitude) state = {
		...state,
		attitude: initialAttitude,
		initialAttitude
	};
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const steps = 4500;
	const logEvery = 250;
	const samples = [];
	const frames = [];
	const logLines = [];
	const header = disableGravityAndAtmosphere ? "ARES CORE vertical burn | mode=VACUUM | gravity=off | atmosphere=off | thrust=+Y | throttle=1 | dt=0.02 s" : "ARES CORE vertical burn | mode=EARTH | gravity=point-mass | atmosphere=exponential | thrust=+Y | throttle=1 | dt=0.02 s";
	logLines.push(header);
	for (let n = 0; n <= steps; n++) {
		const timeS = n / 50;
		if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
			const frame = sampleState(state, timeS, env, propulsion, 1);
			if (n % FRAME_STRIDE === 0) frames.push(frame);
			if (n % logEvery === 0) {
				samples.push(frame);
				logLines.push(formatLogLine(frame));
			}
		}
		if (n === steps) break;
		state = stepRk4(state, 1 / 50, substeps, env, propulsion, 1);
	}
	const finalMassKg = state.totalMassKg;
	const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
	const achieved = state.velocity.sub(initialVelocity).magnitude;
	const thrustDv = state.thrustIntegratedDeltaVMps;
	const difference = ideal - achieved;
	const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
	const vacuumCheckApplies = disableGravityAndAtmosphere;
	const vacuumCheckPassed = !vacuumCheckApplies || relativeError < VACUUM_AGREEMENT_LIMIT;
	logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
	logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
	logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
	logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
	logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
	logLines.push(vacuumCheckApplies ? `verdict=${vacuumCheckPassed ? "PASS" : "FAIL"} vacuum agreement limit=0.10000000 %` : "verdict=GRAVITY_AND_DRAG_LOSS vacuum agreement not applicable");
	return {
		disableGravityAndAtmosphere,
		substeps,
		samples,
		frames,
		logLines,
		logText: logLines.join("\n"),
		initialMassKg,
		finalMassKg,
		initialVelocity,
		finalPosition: state.position,
		finalVelocity: state.velocity,
		idealDeltaVMps: ideal,
		achievedDeltaVMps: achieved,
		thrustIntegratedDeltaVMps: thrustDv,
		differenceMps: difference,
		relativeError,
		vacuumCheckApplies,
		vacuumCheckPassed,
		pitchProgram: null,
		cutoff: null,
		endTimeS: 90
	};
}
/**
* Engines off. Gravity off so the inertial velocity stays on +Y and α is the body pitch.
* Atmosphere on. Initial attitude is a +Z rotation of `alphaDeg`, so α starts at that angle.
* The center of pressure is aft of the CoM, so M_z restores α toward 0.
*/
function runWeathercockCoast(substeps = 1, alphaDeg = 5, speedMps = 100) {
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const env = createEarthEnvironment({
		gravityEnabled: false,
		atmosphereEnabled: true,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	const alphaRad = alphaDeg * Math.PI / 180;
	const attitude = alphaRad === 0 ? QuaternionD.identity : QuaternionD.fromAxisAngle(new Vector3d(0, 0, 1), alphaRad);
	let state = createSeaLevelState(env, Vector3d.zero, 0, false);
	state = {
		...state,
		velocity: new Vector3d(0, speedMps, 0),
		attitude,
		initialAttitude: attitude
	};
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const steps = 6e3;
	const logEvery = 250;
	const samples = [];
	const frames = [];
	const logLines = [];
	logLines.push(`ARES CORE weathercock | mode=ATMOSPHERE | gravity=off | thrust=0 | alpha0=${alphaDeg} deg | v=${speedMps} m/s | dt=0.02 s`);
	for (let n = 0; n <= steps; n++) {
		const timeS = n / 50;
		if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
			const frame = sampleState(state, timeS, env, propulsion, 0, 0, Vector3d.up, timeS);
			if (n % FRAME_STRIDE === 0) frames.push(frame);
			if (n % logEvery === 0) {
				samples.push(frame);
				logLines.push(formatLogLine(frame));
			}
		}
		if (n === steps) break;
		state = stepRk4(state, 1 / 50, substeps, env, propulsion, 0);
	}
	const finalMassKg = state.totalMassKg;
	const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
	const achieved = state.velocity.sub(initialVelocity).magnitude;
	const thrustDv = state.thrustIntegratedDeltaVMps;
	const difference = ideal - achieved;
	const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
	logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
	logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
	logLines.push("verdict=AERO_MOMENT engines off");
	return {
		disableGravityAndAtmosphere: false,
		substeps,
		samples,
		frames,
		logLines,
		logText: logLines.join("\n"),
		initialMassKg,
		finalMassKg,
		initialVelocity,
		finalPosition: state.position,
		finalVelocity: state.velocity,
		idealDeltaVMps: ideal,
		achievedDeltaVMps: achieved,
		thrustIntegratedDeltaVMps: thrustDv,
		differenceMps: difference,
		relativeError,
		vacuumCheckApplies: false,
		vacuumCheckPassed: true,
		pitchProgram: null,
		cutoff: null,
		endTimeS: 120
	};
}
/**
* Same 90 s sea-level burn as Pass 1, with an open-loop thrust direction.
* A program that never leaves +Y delegates to runVerticalBurn, so those numbers stay identical.
*/
function runPitchedBurn(disableGravityAndAtmosphere, substeps = 1, program, angularVelocityBody = Vector3d.zero, gimbalRad = 0, controllerEnabled = false) {
	if (pitchAngleDeg(90, program) === 0) return runVerticalBurn(disableGravityAndAtmosphere, substeps, angularVelocityBody, gimbalRad, controllerEnabled);
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const env = createEarthEnvironment({
		gravityEnabled: !disableGravityAndAtmosphere,
		atmosphereEnabled: !disableGravityAndAtmosphere,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const steps = 4500;
	const logEvery = 250;
	const samples = [];
	const frames = [];
	const logLines = [];
	const mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
	const pitchText = program.holdPitchDeg === null ? `pitch_rate=${program.pitchRateDegPerS} deg/s` : `hold_pitch=${program.holdPitchDeg} deg`;
	logLines.push(`ARES CORE pitch program | mode=${mode} | t_vertical=${program.tVerticalS} s | ${pitchText} | plane=XY | throttle=1 | dt=0.02 s`);
	for (let n = 0; n <= steps; n++) {
		const timeS = n / 50;
		const pitchDeg = pitchAngleDeg(timeS, program);
		const direction = thrustDirectionAt(timeS, program);
		if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
			const frame = sampleState(state, timeS, env, propulsion, 1, pitchDeg, direction);
			if (n % FRAME_STRIDE === 0) frames.push(frame);
			if (n % logEvery === 0) {
				samples.push(frame);
				logLines.push(formatLogLine(frame));
			}
		}
		if (n === steps) break;
		state = stepRk4(state, 1 / 50, substeps, env, propulsion, 1, direction);
	}
	const finalMassKg = state.totalMassKg;
	const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
	const achieved = state.velocity.sub(initialVelocity).magnitude;
	const thrustDv = state.thrustIntegratedDeltaVMps;
	const difference = ideal - achieved;
	const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
	logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
	logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
	logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
	logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
	logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
	logLines.push("verdict=OPEN_LOOP_PITCH");
	return {
		disableGravityAndAtmosphere,
		substeps,
		samples,
		frames,
		logLines,
		logText: logLines.join("\n"),
		initialMassKg,
		finalMassKg,
		initialVelocity,
		finalPosition: state.position,
		finalVelocity: state.velocity,
		idealDeltaVMps: ideal,
		achievedDeltaVMps: achieved,
		thrustIntegratedDeltaVMps: thrustDv,
		differenceMps: difference,
		relativeError,
		vacuumCheckApplies: false,
		vacuumCheckPassed: true,
		pitchProgram: program,
		cutoff: null,
		endTimeS: 90
	};
}
function markCutoff(mark, timeS) {
	if (mark.timeS === null || timeS < mark.timeS) mark.timeS = timeS;
}
/**
* One major step. Throttle is 1 until cutoff, then 0.
* A cutoff that lands inside the step splits it. The RK4 step itself is unchanged.
* With no cutoff this is a single stepRk4 of the full dt.
*/
function stepCommanded(state, timeS, dt, substeps, env, propulsion, cutoff, direction, mark) {
	let cursor = timeS;
	let left = dt;
	let current = state;
	for (let guard = 0; guard < 4 && left > 1e-12; guard++) {
		if (!(commandThrottle(cursor, current.propellantMassKg, cutoff) > 0)) {
			markCutoff(mark, cursor);
			return stepRk4(current, left, substeps, env, propulsion, 0, direction);
		}
		let segment = left;
		let snapTo = null;
		if (cutoff.tCutoffS !== null && cursor < cutoff.tCutoffS && cursor + segment > cutoff.tCutoffS) segment = cutoff.tCutoffS - cursor;
		if (cutoff.propellantRemainingKg !== null) {
			const threshold = cutoff.propellantRemainingKg;
			const burnable = current.propellantMassKg - threshold;
			const mdot = massFlowKgS(propulsion, 1, current.propellantMassKg);
			if (!(burnable > 0) || !(mdot > 0)) {
				markCutoff(mark, cursor);
				return stepRk4(current, left, substeps, env, propulsion, 0, direction);
			}
			const dtFuel = burnable / mdot;
			if (dtFuel < segment) {
				segment = dtFuel;
				snapTo = threshold;
			}
		}
		if (!(segment > 0)) break;
		if (segment >= left - 1e-15 && snapTo === null) return stepRk4(current, left, substeps, env, propulsion, 1, direction);
		current = stepRk4(current, segment, substeps, env, propulsion, 1, direction);
		cursor += segment;
		left -= segment;
		if (snapTo !== null) {
			current = withTranslation(current, current.position, current.velocity, snapTo, DRY_MASS_KG + Math.max(snapTo, 0), current.thrustIntegratedDeltaVMps);
			markCutoff(mark, cursor);
			if (left > 1e-12) return stepRk4(current, left, substeps, env, propulsion, 0, direction);
			return current;
		}
	}
	return current;
}
/**
* Pass 3. Same sea-level burn as Pass 1 / Pass 2, with optional cutoff and a longer coast.
* Cutoff that cannot engage before endTime, on a 90 s run, delegates to the verified function.
*/
function runCoastBurn(disableGravityAndAtmosphere, substeps, program, cutoff, endTimeS, angularVelocityBody = Vector3d.zero, gimbalRad = 0, controllerEnabled = false) {
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const steps = Math.round(endTimeS * 50);
	if (!(steps > 0) || Math.abs(endTimeS * 50 - steps) > 1e-6) throw new Error("end time must land on the 50 Hz step grid");
	if (cutoff.propellantRemainingKg === null && (cutoff.tCutoffS === null || cutoff.tCutoffS > endTimeS) && endTimeS === 90) {
		if (pitchAngleDeg(90, program) === 0) return runVerticalBurn(disableGravityAndAtmosphere, substeps, angularVelocityBody, gimbalRad, controllerEnabled);
		return runPitchedBurn(disableGravityAndAtmosphere, substeps, program, angularVelocityBody, gimbalRad, controllerEnabled);
	}
	const env = createEarthEnvironment({
		gravityEnabled: !disableGravityAndAtmosphere,
		atmosphereEnabled: !disableGravityAndAtmosphere,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const mark = { timeS: null };
	const logEvery = 250;
	const samples = [];
	const frames = [];
	const logLines = [];
	const mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
	const pitchText = pitchAngleDeg(endTimeS, program) === 0 ? "pitch=vertical" : program.holdPitchDeg === null ? `pitch_rate=${program.pitchRateDegPerS} deg/s after ${program.tVerticalS} s` : `hold_pitch=${program.holdPitchDeg} deg after ${program.tVerticalS} s`;
	const cutoffText = cutoff.tCutoffS === null ? "t_cutoff=never" : `t_cutoff=${cutoff.tCutoffS} s`;
	const propText = cutoff.propellantRemainingKg === null ? "mp_cutoff=none" : `mp_cutoff=${cutoff.propellantRemainingKg} kg`;
	logLines.push(`ARES CORE cutoff coast | mode=${mode} | ${cutoffText} | ${propText} | end=${endTimeS} s | ${pitchText} | dt=0.02 s`);
	for (let n = 0; n <= steps; n++) {
		const timeS = n / 50;
		const pitchDeg = pitchAngleDeg(timeS, program);
		const direction = thrustDirectionAt(timeS, program);
		const throttle = commandThrottle(timeS, state.propellantMassKg, cutoff);
		if (throttle === 0) markCutoff(mark, timeS);
		const since = mark.timeS === null || !(timeS > mark.timeS) ? 0 : timeS - mark.timeS;
		if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
			const frame = sampleState(state, timeS, env, propulsion, throttle, pitchDeg, direction, since);
			if (n % FRAME_STRIDE === 0) frames.push(frame);
			if (n % logEvery === 0) {
				samples.push(frame);
				logLines.push(formatLogLine(frame));
			}
		}
		if (n === steps) break;
		state = stepCommanded(state, timeS, 1 / 50, substeps, env, propulsion, cutoff, direction, mark);
	}
	const finalMassKg = state.totalMassKg;
	const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
	const achieved = state.velocity.sub(initialVelocity).magnitude;
	const thrustDv = state.thrustIntegratedDeltaVMps;
	const difference = ideal - achieved;
	const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
	const engaged = mark.timeS !== null;
	logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
	logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
	logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
	logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
	logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
	logLines.push(engaged ? "verdict=CUTOFF_AND_COAST" : "verdict=CONTINUOUS_THRUST");
	return {
		disableGravityAndAtmosphere,
		substeps,
		samples,
		frames,
		logLines,
		logText: logLines.join("\n"),
		initialMassKg,
		finalMassKg,
		initialVelocity,
		finalPosition: state.position,
		finalVelocity: state.velocity,
		idealDeltaVMps: ideal,
		achievedDeltaVMps: achieved,
		thrustIntegratedDeltaVMps: thrustDv,
		differenceMps: difference,
		relativeError,
		vacuumCheckApplies: false,
		vacuumCheckPassed: true,
		pitchProgram: pitchAngleDeg(endTimeS, program) === 0 ? null : program,
		cutoff: engaged ? cutoff : null,
		endTimeS
	};
}
function analyticForce(position, massKg, mu, equatorialRadiusM) {
	const radius = position.magnitude;
	const gravity = mu > 0 && radius > 0 ? mu / (radius * radius) : 0;
	const gravityAccel = gravity > 0 ? position.scale(-gravity / radius) : Vector3d.zero;
	return {
		altitudeM: radius - equatorialRadiusM,
		massKg,
		acceleration: gravityAccel,
		accelerationMagnitudeMps2: gravity,
		thrustN: 0,
		thrustAccelMps2: 0,
		dragN: 0,
		dragAccel: Vector3d.zero,
		gravityMps2: gravity,
		gravityAccel,
		densityKgM3: 0,
		dynamicPressurePa: 0,
		massFlowKgS: 0
	};
}
/**
* Pass 4. Powered flight and the cutoff instant stay on the Pass 3 RK4 path.
* After thrust is zero, position and velocity come from a universal-variable Kepler step.
* Drag is not applied on that arc. Gravity off degenerates to a straight line.
* A cutoff that never engages delegates to {@link runCoastBurn}.
*/
function runKeplerCoast(disableGravityAndAtmosphere, substeps, program, cutoff, endTimeS, angularVelocityBody = Vector3d.zero, gimbalRad = 0, controllerEnabled = false) {
	if (cutoff.propellantRemainingKg === null && (cutoff.tCutoffS === null || cutoff.tCutoffS > endTimeS)) return runCoastBurn(disableGravityAndAtmosphere, substeps, program, cutoff, endTimeS, angularVelocityBody, gimbalRad, controllerEnabled);
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const steps = Math.round(endTimeS * 50);
	if (!(steps > 0) || Math.abs(endTimeS * 50 - steps) > 1e-6) throw new Error("end time must land on the 50 Hz step grid");
	const env = createEarthEnvironment({
		gravityEnabled: !disableGravityAndAtmosphere,
		atmosphereEnabled: !disableGravityAndAtmosphere,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const mark = { timeS: null };
	let capture = null;
	const logEvery = 250;
	const samples = [];
	const frames = [];
	const logLines = [];
	const mu = env.gravityEnabled ? env.muM3S2 : 0;
	const mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
	const pitchText = pitchAngleDeg(endTimeS, program) === 0 ? "pitch=vertical" : program.holdPitchDeg === null ? `pitch_rate=${program.pitchRateDegPerS} deg/s after ${program.tVerticalS} s` : `hold_pitch=${program.holdPitchDeg} deg after ${program.tVerticalS} s`;
	const cutoffText = cutoff.tCutoffS === null ? "t_cutoff=never" : `t_cutoff=${cutoff.tCutoffS} s`;
	logLines.push(`ARES CORE analytic kepler | mode=${mode} | ${cutoffText} | end=${endTimeS} s | ${pitchText} | drag=off | dt=0.02 s`);
	for (let n = 0; n <= steps; n++) {
		const timeS = n / 50;
		if (capture && timeS > capture.timeS) {
			const propagated = propagateKepler(capture.position, capture.velocity, capture.muM3S2, timeS - capture.timeS);
			state = withTranslation(state, propagated.position, propagated.velocity, capture.propellantKg, capture.totalMassKg, capture.thrustIntegratedDeltaVMps);
		}
		const pitchDeg = pitchAngleDeg(timeS, program);
		const direction = thrustDirectionAt(timeS, program);
		const throttle = commandThrottle(timeS, state.propellantMassKg, cutoff);
		if (capture === null && throttle === 0) {
			const elements = keplerElements(state.position, state.velocity, mu);
			capture = {
				timeS,
				position: state.position,
				velocity: state.velocity,
				muM3S2: mu,
				propellantKg: state.propellantMassKg,
				totalMassKg: state.totalMassKg,
				thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps,
				elements
			};
			markCutoff(mark, timeS);
		} else if (throttle === 0) markCutoff(mark, timeS);
		const since = mark.timeS === null || !(timeS > mark.timeS) ? 0 : timeS - mark.timeS;
		const onAnalyticArc = capture !== null && timeS > capture.timeS;
		if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
			let frame;
			if (onAnalyticArc && capture) {
				const force = analyticForce(state.position, capture.totalMassKg, mu, env.equatorialRadiusM);
				frame = stampAttitude(frameFromForce(timeS, state.velocity, state.position, capture.propellantKg, force, pitchDeg, 0, since, specificMechanicalEnergyM2S2(state.position, state.velocity, mu), "analytic", capture.elements.semiMajorAxisM, capture.elements.eccentricity, timeS - capture.timeS), state);
			} else {
				frame = sampleState(state, timeS, env, propulsion, throttle, pitchDeg, direction, since);
				if (capture && timeS === capture.timeS) frame = {
					...frame,
					semiMajorAxisM: capture.elements.semiMajorAxisM,
					eccentricity: capture.elements.eccentricity,
					timeSinceElementsS: 0
				};
			}
			if (n % FRAME_STRIDE === 0) frames.push(frame);
			if (n % logEvery === 0) {
				samples.push(frame);
				logLines.push(formatLogLine(frame));
			}
		}
		if (n === steps) break;
		if (capture) {
			state = advanceAttitude(state, 1 / 50, substeps);
			continue;
		}
		state = stepCommanded(state, timeS, 1 / 50, substeps, env, propulsion, cutoff, direction, mark);
	}
	const finalMassKg = state.totalMassKg;
	const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
	const achieved = state.velocity.sub(initialVelocity).magnitude;
	const thrustDv = state.thrustIntegratedDeltaVMps;
	const difference = ideal - achieved;
	const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
	logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
	logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
	logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
	logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
	logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
	logLines.push(capture ? "verdict=ANALYTIC_KEPLER" : "verdict=CONTINUOUS_THRUST");
	return {
		disableGravityAndAtmosphere,
		substeps,
		samples,
		frames,
		logLines,
		logText: logLines.join("\n"),
		initialMassKg,
		finalMassKg,
		initialVelocity,
		finalPosition: state.position,
		finalVelocity: state.velocity,
		idealDeltaVMps: ideal,
		achievedDeltaVMps: achieved,
		thrustIntegratedDeltaVMps: thrustDv,
		differenceMps: difference,
		relativeError,
		vacuumCheckApplies: false,
		vacuumCheckPassed: true,
		pitchProgram: pitchAngleDeg(endTimeS, program) === 0 ? null : program,
		cutoff: capture ? cutoff : null,
		endTimeS,
		analyticKepler: capture !== null,
		keplerCapture: capture
	};
}
function closeReport(state, initialVelocity, initialMassKg, propulsion, disableGravityAndAtmosphere, substeps, samples, frames, logLines, endTimeS, verdict, extra = {}) {
	const finalMassKg = state.totalMassKg;
	const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
	const achieved = state.velocity.sub(initialVelocity).magnitude;
	const thrustDv = state.thrustIntegratedDeltaVMps;
	const difference = ideal - achieved;
	const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
	logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
	logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
	logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
	logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
	logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
	logLines.push(verdict);
	return {
		disableGravityAndAtmosphere,
		substeps,
		samples,
		frames,
		logLines,
		logText: logLines.join("\n"),
		initialMassKg,
		finalMassKg,
		initialVelocity,
		finalPosition: state.position,
		finalVelocity: state.velocity,
		idealDeltaVMps: ideal,
		achievedDeltaVMps: achieved,
		thrustIntegratedDeltaVMps: thrustDv,
		differenceMps: difference,
		relativeError,
		vacuumCheckApplies: false,
		vacuumCheckPassed: true,
		pitchProgram: null,
		cutoff: null,
		endTimeS,
		...extra
	};
}
/**
* Pass 5. Pure vertical thrust from the Mars surface.
* Same RK4 step and vehicle as Earth. Does not run when Earth is selected.
*/
function runMarsVerticalBurn(disableGravityAndAtmosphere, substeps = 1, durationS = 60, angularVelocityBody = Vector3d.zero, gimbalRad = 0) {
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const steps = Math.round(durationS * 50);
	if (!(steps > 0) || Math.abs(durationS * 50 - steps) > 1e-6) throw new Error("end time must land on the 50 Hz step grid");
	const env = createMarsEnvironment({
		gravityEnabled: !disableGravityAndAtmosphere,
		atmosphereEnabled: !disableGravityAndAtmosphere,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, false);
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const logEvery = 250;
	const samples = [];
	const frames = [];
	const logLines = [];
	const mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
	logLines.push(`ARES CORE mars vertical burn | mode=${mode} | body=Mars | thrust=+Y | throttle=1 | end=${durationS} s | dt=0.02 s`);
	for (let n = 0; n <= steps; n++) {
		const timeS = n / 50;
		if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
			const frame = sampleState(state, timeS, env, propulsion, 1);
			if (n % FRAME_STRIDE === 0) frames.push(frame);
			if (n % logEvery === 0) {
				samples.push(frame);
				logLines.push(formatLogLine(frame));
			}
		}
		if (n === steps) break;
		state = stepRk4(state, 1 / 50, substeps, env, propulsion, 1);
	}
	return closeReport(state, initialVelocity, initialMassKg, propulsion, disableGravityAndAtmosphere, substeps, samples, frames, logLines, durationS, "verdict=MARS_SURFACE_BURN");
}
/**
* Pass 5 entry interface. Engines stay off.
* Numerical coast uses RK4 with the active atmosphere. Analytic Kepler ignores drag.
*/
function runMarsEntry(disableGravityAndAtmosphere, substeps = 1, analytic = false, endTimeS = 300, entry = MARS_ENTRY_INTERFACE, angularVelocityBody = Vector3d.zero, gimbalRad = 0) {
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const steps = Math.round(endTimeS * 50);
	if (!(steps > 0) || Math.abs(endTimeS * 50 - steps) > 1e-6) throw new Error("end time must land on the 50 Hz step grid");
	const env = createMarsEnvironment({
		gravityEnabled: !disableGravityAndAtmosphere,
		atmosphereEnabled: !disableGravityAndAtmosphere,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	let state = createEntryState(env, entry, angularVelocityBody, gimbalRad, false);
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const mu = env.gravityEnabled ? env.muM3S2 : 0;
	const logEvery = 250;
	const samples = [];
	const frames = [];
	const logLines = [];
	const mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
	logLines.push(`ARES CORE mars entry | mode=${mode} | body=Mars | h0=${entry.altitudeM} m | v0=${entry.speedMps} m/s | gamma0=${entry.flightPathDeg} deg | mp=${entry.propellantKg} kg | coast=${analytic ? "analytic" : "numerical"} | end=${endTimeS} s | dt=0.02 s`);
	let capture = null;
	if (analytic) capture = {
		timeS: 0,
		position: state.position,
		velocity: state.velocity,
		muM3S2: mu,
		propellantKg: state.propellantMassKg,
		totalMassKg: state.totalMassKg,
		thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps,
		elements: keplerElements(state.position, state.velocity, mu)
	};
	for (let n = 0; n <= steps; n++) {
		const timeS = n / 50;
		if (capture && timeS > capture.timeS) {
			const propagated = propagateKepler(capture.position, capture.velocity, capture.muM3S2, timeS - capture.timeS);
			state = withTranslation(state, propagated.position, propagated.velocity, capture.propellantKg, capture.totalMassKg, capture.thrustIntegratedDeltaVMps);
		}
		const onAnalyticArc = capture !== null && timeS > capture.timeS;
		if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
			let frame;
			if (onAnalyticArc && capture) {
				const force = analyticForce(state.position, capture.totalMassKg, mu, env.equatorialRadiusM);
				frame = stampAttitude(frameFromForce(timeS, state.velocity, state.position, capture.propellantKg, force, 0, 0, timeS, specificMechanicalEnergyM2S2(state.position, state.velocity, mu), "analytic", capture.elements.semiMajorAxisM, capture.elements.eccentricity, timeS - capture.timeS, env.name, env.speedOfSoundMps), state);
			} else {
				frame = sampleState(state, timeS, env, propulsion, 0, 0, Vector3d.up, timeS);
				if (capture && timeS === capture.timeS) frame = {
					...frame,
					semiMajorAxisM: capture.elements.semiMajorAxisM,
					eccentricity: capture.elements.eccentricity,
					timeSinceElementsS: 0
				};
			}
			if (n % FRAME_STRIDE === 0) frames.push(frame);
			if (n % logEvery === 0) {
				samples.push(frame);
				logLines.push(formatLogLine(frame));
			}
		}
		if (n === steps) break;
		if (capture) {
			state = advanceAttitude(state, 1 / 50, substeps);
			continue;
		}
		state = stepRk4(state, 1 / 50, substeps, env, propulsion, 0);
	}
	return closeReport(state, initialVelocity, initialMassKg, propulsion, disableGravityAndAtmosphere, substeps, samples, frames, logLines, endTimeS, analytic ? "verdict=MARS_ENTRY_ANALYTIC" : "verdict=MARS_ENTRY_NUMERICAL", {
		analyticKepler: analytic,
		keplerCapture: capture
	});
}
var TERMINAL_FRAME_STRIDE = 50;
/**
* Pass 6. Mars entry with an open-loop flip and landing burn.
* Not called by any Pass 1–5 path. Engines stay off until the trigger.
*/
function runMarsTerminalLanding(disableGravityAndAtmosphere, substeps = 1, config = DEFAULT_TERMINAL_SEQUENCE, entry = MARS_ENTRY_INTERFACE, angularVelocityBody = Vector3d.zero, gimbalRad = 0) {
	if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
	const dt = 1 / 50;
	const maxSteps = Math.round(TERMINAL_MAX_TIME_S * 50);
	const logEvery = 250;
	const env = createMarsEnvironment({
		gravityEnabled: !disableGravityAndAtmosphere,
		atmosphereEnabled: !disableGravityAndAtmosphere,
		includeJ2: false
	});
	const propulsion = createDefaultPropulsion();
	let state = createEntryState(env, entry, angularVelocityBody, gimbalRad, false);
	const initialVelocity = state.velocity;
	const initialMassKg = state.totalMassKg;
	const sequence = new TerminalSequence(config);
	const samples = [];
	const frames = [];
	const logLines = [];
	const mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
	const triggerLabel = config.triggerTimeS !== null ? `t:${config.triggerTimeS}` : `h:${config.triggerAltitudeM ?? "none"}`;
	const proportional = config.guidanceMode === "Proportional";
	const rawFraction = config.horizontalFraction;
	const hfSuffix = !proportional && typeof rawFraction === "number" && rawFraction > 0 ? ` | hf=${(rawFraction > 1 ? 1 : rawFraction).toFixed(4)}` : "";
	const guideSuffix = proportional ? ` | guide=Proportional | k=${(config.proportionalGain ?? 1).toFixed(4)} | vref=${(config.proportionalSpeedRefMps ?? 500).toFixed(3)} | hf_max=${(config.maxHorizontalFraction ?? .75).toFixed(4)}` : "";
	logLines.push(`ARES CORE mars terminal | mode=${mode} | body=Mars | trigger=${triggerLabel} | flip=${config.flipDurationS} s | flip_throttle=${config.flipThrottle} | landing_throttle=${config.landingThrottle} | dt=0.02 s${hfSuffix}${guideSuffix}`);
	let loggedPhase = null;
	let peak = state.velocity.magnitude;
	let impact = null;
	let endTimeS = 0;
	const pushFrame = (frame, sample) => {
		frames.push(frame);
		if (!sample) return;
		samples.push(frame);
		logLines.push(formatLogLine(frame) + formatTerminalSuffix(frame));
	};
	for (let n = 0; n <= maxSteps; n++) {
		const timeS = n / 50;
		const height = altitudeM(env, state.position);
		const speed = state.velocity.magnitude;
		if (speed > peak) peak = speed;
		const command = sequence.command(timeS, state.position, state.velocity, state.propellantMassKg, height, state.attitude, state.angularVelocityBody.z);
		const flipping = command.bodyThrust === true && config.flipControllerEnabled !== false;
		state = {
			...state,
			controllerEnabled: flipping,
			pitchTargetRad: flipping ? verticalTargetRad(state.position) : 0,
			flipHold: flipping
		};
		const phaseChanged = command.phase !== loggedPhase;
		const onLog = n % logEvery === 0;
		if (n % TERMINAL_FRAME_STRIDE === 0 || onLog || phaseChanged) {
			pushFrame(decorateTerminal(state, timeS, env, propulsion, command, null, peak), onLog || phaseChanged);
			loggedPhase = command.phase;
		}
		if (height <= 0) {
			impact = assessImpact(state, Math.max(peak, state.velocity.magnitude));
			if (command.phase === "Flip") impact = {
				...impact,
				flag: "RUD"
			};
			const landed = {
				...state,
				position: state.position.magnitude > 0 ? state.position.normalized.scale(env.equatorialRadiusM) : new Vector3d(0, env.equatorialRadiusM, 0)
			};
			pushFrame(decorateTerminal(landed, timeS, env, propulsion, impactCommand(config, landed, command), impact, impact.peakSpeedMps), true);
			endTimeS = timeS;
			state = landed;
			break;
		}
		if (n === maxSteps) {
			endTimeS = timeS;
			break;
		}
		const before = cloneState(state);
		state = stepRk4(state, dt, substeps, env, propulsion, command.throttle, command.direction);
		if (altitudeM(env, state.position) <= 0 && height > 0) {
			const hit = surfaceState(before, state, env.equatorialRadiusM);
			state = hit.state;
			endTimeS = timeS + hit.u * dt;
			const hitSpeed = state.velocity.magnitude;
			if (hitSpeed > peak) peak = hitSpeed;
			impact = assessImpact(state, peak);
			if (command.phase === "Flip") impact = {
				...impact,
				flag: "RUD"
			};
			const hitCommand = sequence.command(endTimeS, state.position, state.velocity, state.propellantMassKg, 0, state.attitude, state.angularVelocityBody.z);
			pushFrame(decorateTerminal(state, endTimeS, env, propulsion, impactCommand(config, state, hitCommand), impact, peak), true);
			break;
		}
	}
	return closeReport(state, initialVelocity, initialMassKg, propulsion, disableGravityAndAtmosphere, substeps, samples, frames, logLines, endTimeS, impact ? impact.flag === "nominal" ? "verdict=TERMINAL_NOMINAL" : "verdict=TERMINAL_RUD" : "verdict=TERMINAL_NO_IMPACT", { terminal: {
		config,
		triggerTimeS: sequence.triggerTimeS,
		impact,
		peakSpeedMps: peak
	} });
}
function impactCommand(config, state, command) {
	const settled = {
		...command,
		phase: "Complete",
		throttle: 0
	};
	if (config.guidanceMode === "Proportional") {
		const fraction = proportionalHorizontalFraction(config, state.position, state.velocity);
		const aim = landingThrustDirection(state.position.magnitude > 0 ? state.position.normalized : Vector3d.up, state.velocity, fraction > 1 ? 1 : fraction);
		return {
			...settled,
			direction: aim.direction,
			pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
			horizontalFraction: fraction,
			guidanceMode: "Proportional"
		};
	}
	const fraction = config.horizontalFraction;
	if (!(typeof fraction === "number") || !(fraction > 0)) return settled;
	const clamped = fraction > 1 ? 1 : fraction;
	const aim = landingThrustDirection(state.position.magnitude > 0 ? state.position.normalized : Vector3d.up, state.velocity, clamped);
	return {
		...settled,
		direction: aim.direction,
		pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
		horizontalFraction: clamped
	};
}
function decorateTerminal(state, timeS, env, propulsion, command, impact, peakSpeedMps) {
	const frame = sampleState(state, timeS, env, propulsion, command.throttle, inertialPitchFromYDeg(command.direction), command.direction, 0);
	const radial = state.position.magnitude > 0 ? state.velocity.dot(state.position.normalized) : 0;
	return {
		...frame,
		altitudeM: impact ? 0 : frame.altitudeM,
		sequencePhase: impact ? "Complete" : command.phase,
		thrustPitchFromVerticalDeg: command.pitchFromVerticalDeg,
		radialMps: radial,
		impactFlag: impact?.flag ?? "",
		impactKineticEnergyJ: impact?.kineticEnergyJ,
		impactSpeedMps: impact?.speedMps,
		impactVerticalMps: impact?.verticalMps,
		impactHorizontalMps: impact?.horizontalMps,
		peakSpeedMps,
		...command.guidanceMode === "Proportional" ? {
			guidanceMode: "Proportional",
			horizontalFraction: command.horizontalFraction ?? 0
		} : command.horizontalFraction !== void 0 && command.horizontalFraction > 0 ? { horizontalFraction: command.horizontalFraction } : {}
	};
}
var TUMBLE_AXIS = new Vector3d(1, .65, .35).normalized;
var SOURCE_FILES = [
	"Assets/Scripts/Math/DoublePrecisionMath.cs",
	"Assets/Scripts/Math/QuaternionD.cs",
	"Assets/Scripts/PhysicsCore/VehicleState.cs",
	"Assets/Scripts/PhysicsCore/CylinderInertia.cs",
	"Assets/Scripts/PhysicsCore/AeroMoment.cs",
	"Assets/Scripts/PhysicsCore/AttitudeController.cs",
	"Assets/Scripts/PhysicsCore/PlanetaryEnvironment.cs",
	"Assets/Scripts/PhysicsCore/PropulsionModel.cs",
	"Assets/Scripts/PhysicsCore/PitchProgram.cs",
	"Assets/Scripts/PhysicsCore/CutoffCommand.cs",
	"Assets/Scripts/PhysicsCore/IntegratorRK4.cs",
	"Assets/Scripts/PhysicsCore/KeplerPropagator.cs",
	"Assets/Scripts/PhysicsCore/TerminalSequence.cs",
	"Assets/Scripts/PhysicsCore/SimulationHarness.cs",
	"Assets/Scripts/PhysicsCore/AresVerticalBurnDriver.cs"
];
function formatFixed(value, digits) {
	if (!Number.isFinite(value)) return "—";
	const negative = value < 0;
	const [whole, frac] = Math.abs(value).toFixed(digits).split(".");
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return `${negative ? "-" : ""}${grouped}${frac !== void 0 ? `.${frac}` : ""}`;
}
function formatTick(seconds) {
	const whole = Math.round(seconds);
	const minutes = Math.floor(whole / 60);
	const rem = whole % 60;
	return `${String(minutes).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}
function formatMet(seconds) {
	const centi = Math.round(seconds * 100);
	const whole = Math.floor(centi / 100);
	const frac = centi % 100;
	const minutes = Math.floor(whole / 60);
	const rem = whole % 60;
	return `${String(minutes).padStart(2, "0")}:${String(rem).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}
function formatDensity(value) {
	if (!Number.isFinite(value)) return "—";
	if (value !== 0 && Math.abs(value) < 1e-4) return value.toExponential(3);
	return formatFixed(value, 6);
}
function formatTiny(value, digits, unit) {
	if (!Number.isFinite(value)) return "—";
	if (value !== 0 && Math.abs(value) < .001) return `${value.toExponential(2)} ${unit}`;
	return `${formatFixed(value, digits)} ${unit}`;
}
function formatAgreement(relativeError) {
	const percent = relativeError * 100;
	if (percent !== 0 && Math.abs(percent) < 1e-4) return `${percent.toExponential(2)}%`;
	return `${formatFixed(percent, 6)}%`;
}
function nearestFrameIndex(frames, timeS) {
	let best = 0;
	let bestDist = Infinity;
	for (let i = 0; i < frames.length; i++) {
		const dist = Math.abs(frames[i].timeS - timeS);
		if (dist < bestDist) {
			best = i;
			bestDist = dist;
		}
	}
	return best;
}
function Channel({ label, value, unit }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0 border-t border-border py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs tracking-widest text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-1 font-mono text-base tabular-nums text-fg",
			children: [value, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-1.5 text-xs tracking-normal text-muted normal-case",
				children: unit
			})]
		})]
	});
}
function Meter({ label, right, fraction }) {
	const width = Math.max(0, Math.min(100, fraction * 100));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-2 flex items-baseline justify-between gap-3 text-xs tracking-widest text-muted uppercase",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono text-sm tracking-normal text-fg normal-case tabular-nums",
			children: right
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-2 overflow-hidden rounded-full bg-surface-2",
		role: "presentation",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-full bg-primary",
			style: { width: `${width}%` }
		})
	})] });
}
function AresInstrument() {
	const [body, setBody] = (0, import_react.useState)("earth");
	const [origin, setOrigin] = (0, import_react.useState)("surface");
	const [mode, setMode] = (0, import_react.useState)("earth");
	const [program, setProgram] = (0, import_react.useState)("vertical");
	const [engine, setEngine] = (0, import_react.useState)("burn");
	const [coast, setCoast] = (0, import_react.useState)("numerical");
	const [terminal, setTerminal] = (0, import_react.useState)("off");
	const [horizontal, setHorizontal] = (0, import_react.useState)(0);
	const [guidance, setGuidance] = (0, import_react.useState)("fixed");
	const [entrySpeed, setEntrySpeed] = (0, import_react.useState)(6e3);
	const [entryPropellant, setEntryPropellant] = (0, import_react.useState)(5e4);
	const [entryGamma, setEntryGamma] = (0, import_react.useState)(-12);
	const [substeps, setSubsteps] = (0, import_react.useState)(1);
	const [bodyRate, setBodyRate] = (0, import_react.useState)(0);
	const [bodyAxis, setBodyAxis] = (0, import_react.useState)("tumble");
	const [gimbalDeg, setGimbalDeg] = (0, import_react.useState)(0);
	const [controller, setController] = (0, import_react.useState)(true);
	const [pitchErrorDeg, setPitchErrorDeg] = (0, import_react.useState)(0);
	const [weathercock, setWeathercock] = (0, import_react.useState)(false);
	const [index, setIndex] = (0, import_react.useState)("end");
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [chartReady, setChartReady] = (0, import_react.useState)(false);
	const playRef = (0, import_react.useRef)(null);
	const omega = (0, import_react.useMemo)(() => {
		if (bodyRate === 0) return Vector3d.zero;
		if (bodyAxis === "tumble") return TUMBLE_AXIS.scale(bodyRate);
		if (bodyAxis === "y") return new Vector3d(0, bodyRate, 0);
		if (bodyAxis === "z") return new Vector3d(0, 0, bodyRate);
		return new Vector3d(bodyRate, 0, 0);
	}, [bodyAxis, bodyRate]);
	const gimbalRad = gimbalDeg * Math.PI / 180;
	const pitchAttitude = (0, import_react.useMemo)(() => pitchErrorDeg === 0 ? null : QuaternionD.fromAxisAngle(new Vector3d(0, 0, 1), pitchErrorDeg * Math.PI / 180), [pitchErrorDeg]);
	const vacuumSeal = (0, import_react.useMemo)(() => runVerticalBurn(true, substeps), [substeps]);
	const report = (0, import_react.useMemo)(() => {
		if (weathercock) return runWeathercockCoast(substeps);
		const vacuum = mode === "vacuum";
		if (pitchAttitude) return runVerticalBurn(vacuum, substeps, Vector3d.zero, controller ? 0 : gimbalRad, controller, pitchAttitude);
		if (body === "mars") {
			if (origin === "entry") {
				const entryState = marsEntryOrDefault(entrySpeed, entryPropellant, entryGamma);
				const tuned = entryState !== MARS_ENTRY_INTERFACE;
				if (terminal === "default" || terminal === "early") {
					const profile = terminal === "early" ? EARLY_TERMINAL_SEQUENCE : DEFAULT_TERMINAL_SEQUENCE;
					if (guidance === "proportional") {
						const config = {
							...profile,
							guidanceMode: "Proportional"
						};
						return tuned ? runMarsTerminalLanding(vacuum, substeps, config, entryState, omega, gimbalRad) : runMarsTerminalLanding(vacuum, substeps, config, MARS_ENTRY_INTERFACE, omega, gimbalRad);
					}
					if (horizontal > 0) {
						const config = {
							...profile,
							horizontalFraction: horizontal
						};
						return tuned ? runMarsTerminalLanding(vacuum, substeps, config, entryState, omega, gimbalRad) : runMarsTerminalLanding(vacuum, substeps, config, MARS_ENTRY_INTERFACE, omega, gimbalRad);
					}
					return tuned ? runMarsTerminalLanding(vacuum, substeps, profile, entryState, omega, gimbalRad) : runMarsTerminalLanding(vacuum, substeps, profile, MARS_ENTRY_INTERFACE, omega, gimbalRad);
				}
				return tuned ? runMarsEntry(vacuum, substeps, coast === "kepler", 300, entryState, omega, gimbalRad) : runMarsEntry(vacuum, substeps, coast === "kepler", 300, MARS_ENTRY_INTERFACE, omega, gimbalRad);
			}
			return runMarsVerticalBurn(vacuum, substeps, 60, omega, gimbalRad);
		}
		const guided = program === "pitch" ? DEFAULT_PITCH_PROGRAM : PURE_VERTICAL_PROGRAM;
		if (coast === "kepler") return runKeplerCoast(vacuum, substeps, guided, engine === "cutoff" ? CUTOFF_AT_60_S : {
			tCutoffS: null,
			propellantRemainingKg: null
		}, engine === "cutoff" ? 120 : 90, omega, gimbalRad, controller);
		if (engine === "cutoff") return runCoastBurn(vacuum, substeps, guided, CUTOFF_AT_60_S, 120, omega, gimbalRad, controller);
		if (program === "pitch") return runPitchedBurn(vacuum, substeps, DEFAULT_PITCH_PROGRAM, omega, gimbalRad, controller);
		if (vacuum && !controller && bodyRate === 0 && gimbalRad === 0) return vacuumSeal;
		return runVerticalBurn(vacuum, substeps, omega, controller ? 0 : gimbalRad, controller);
	}, [
		body,
		bodyRate,
		coast,
		controller,
		engine,
		entryGamma,
		entryPropellant,
		entrySpeed,
		gimbalRad,
		guidance,
		horizontal,
		mode,
		omega,
		origin,
		pitchAttitude,
		program,
		substeps,
		terminal,
		vacuumSeal,
		weathercock
	]);
	const frameIndex = index === "end" ? report.frames.length - 1 : Math.min(index, report.frames.length - 1);
	const frame = report.frames[frameIndex] ?? report.frames[report.frames.length - 1];
	const chartData = (0, import_react.useMemo)(() => report.frames.map((sample) => ({
		t: sample.timeS,
		altKm: sample.altitudeM / 1e3,
		speed: sample.speedMps
	})), [report]);
	const activeSample = report.samples.reduce((best, sample) => sample.timeS <= frame.timeS + 1e-9 ? sample : best, report.samples[0]);
	(0, import_react.useEffect)(() => {
		setChartReady(true);
		return () => {
			if (playRef.current !== null) cancelAnimationFrame(playRef.current);
		};
	}, []);
	function stopPlayback() {
		if (playRef.current !== null) cancelAnimationFrame(playRef.current);
		playRef.current = null;
	}
	function replay() {
		stopPlayback();
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const last = report.frames.length - 1;
		if (reduce) {
			setIndex("end");
			return;
		}
		const started = performance.now();
		const tick = (now) => {
			const u = Math.min(1, (now - started) / 8e3);
			setIndex(Math.round(u * last));
			if (u < 1) playRef.current = requestAnimationFrame(tick);
			else playRef.current = null;
		};
		playRef.current = requestAnimationFrame(tick);
	}
	async function copyLog() {
		try {
			await navigator.clipboard.writeText(report.logText);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			setCopied(false);
		}
	}
	const tw = frame.totalMassKg > 0 && frame.thrustN > 0 ? frame.thrustN / (frame.totalMassKg * G0_MPS2) : 0;
	const mdot = frame.thrustN > 0 ? frame.thrustN / (380 * G0_MPS2) : 0;
	const propellantCapacity = report.samples[0]?.propellantKg ?? 12e5;
	const propellantFraction = propellantCapacity > 0 ? frame.propellantKg / propellantCapacity : 0;
	const achievedShare = report.idealDeltaVMps > 0 ? report.achievedDeltaVMps / report.idealDeltaVMps : 0;
	const momentumStart = report.samples[0]?.angularMomentumKgM2S ?? 0;
	const massStart = report.samples[0]?.totalMassKg ?? 0;
	const specificStart = massStart > 0 ? momentumStart / massStart : 0;
	const lix0 = report.samples[0]?.angularMomentumInertialX ?? 0;
	const liy0 = report.samples[0]?.angularMomentumInertialY ?? 0;
	const liz0 = report.samples[0]?.angularMomentumInertialZ ?? 0;
	const specificVectorDrift = specificStart > 0 && frame.totalMassKg > 0 ? Math.hypot(frame.angularMomentumInertialX / frame.totalMassKg - lix0 / massStart, frame.angularMomentumInertialY / frame.totalMassKg - liy0 / massStart, frame.angularMomentumInertialZ / frame.totalMassKg - liz0 / massStart) / specificStart : 0;
	const terminalLive = body === "mars" && origin === "entry";
	const terminalArmed = terminalLive && terminal !== "off";
	const entryState = marsEntryOrDefault(entrySpeed, entryPropellant, entryGamma);
	const entryTuned = terminalLive && entryState !== MARS_ENTRY_INTERFACE;
	const proportional = terminalArmed && guidance === "proportional";
	const fixedFraction = terminalArmed && !proportional ? report.terminal?.config.horizontalFraction ?? 0 : 0;
	const horizLive = terminalArmed && guidance !== "proportional";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen w-full max-w-5xl px-4 py-5 pb-16 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "border-b border-border pb-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-primary uppercase",
							children: pitchErrorDeg > 0 || controller && !weathercock && body === "earth" && !terminalArmed ? "Attitude hold" : weathercock ? "Aero moment" : gimbalDeg > 0 && !controller ? "Gimbal moment" : bodyRate > 0 && !controller ? "Torque-free Euler" : proportional || entryTuned ? "Mars GNC · Pass 8" : terminalArmed ? fixedFraction > 0 ? "Mars GNC · Pass 7" : "Mars GNC · Pass 6" : body === "mars" ? "Mars GNC · Pass 5" : report.analyticKepler ? "Mars GNC · Pass 4" : engine === "cutoff" ? "Mars GNC · Pass 3" : program === "pitch" ? "Mars GNC · Pass 2" : "Mars GNC · Pass 1"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 font-mono text-3xl leading-none text-fg sm:text-4xl",
							children: "ARES CORE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 max-w-xl text-sm text-pretty text-muted",
							children: [
								weathercock ? null : body === "mars" ? origin === "entry" ? terminal === "default" ? proportional ? "Proportional landing law after the 3 km gate. The share is clamp(horizontal speed / 500 m/s, 0, 0.75) and is held for each 0.02 s step. Throttle stays 60%." : fixedFraction > 0 ? "Terminal sequence armed. Coast to 3 km, then a powered flip at 60% thrust. The pitch loop holds the nose within 5° of local vertical before the landing burn aims between local up and the anti-horizontal direction." : "Terminal sequence armed. Coast to 3 km. The flip holds 60% thrust along body +Y and the pitch loop drives that axis onto local vertical. The landing burn starts only inside 5°. Radial speed within 2 m/s and horizontal speed within 0.5 m/s is nominal. An impact before that gate is a RUD." : terminal === "early" ? proportional ? "Proportional landing law after the 5 km gate, then full thrust. The share is clamp(horizontal speed / 500 m/s, 0, 0.75). The flip is the same powered pitch loop." : fixedFraction > 0 ? "Earlier gate at 5 km, powered flip, then full thrust with the scheduled horizontal share. The touchdown gate is unchanged." : "Earlier gate at 5 km, then the same powered flip and a 100% vertical burn. The touchdown gate is unchanged. Vertical thrust does not cancel horizontal speed." : entryTuned ? `Entry ${formatFixed(entrySpeed, 0)} m/s at ${formatFixed(entryGamma, 1)}°, ${formatFixed(entryPropellant, 0)} kg. Altitude stays 125 km. Engines stay off until a terminal sequence is armed.` : mode === "vacuum" ? "Entry interface with gravity and atmosphere off. 6 km/s at −12° holds a straight line. Engines stay off." : coast === "kepler" ? "125 km, 6,000 m/s, −12°. Engines off. After the capture instant the arc is drag-free Kepler and specific energy stays constant." : "125 km, 6,000 m/s, −12°, 50 t of propellant left. Engines off for 300 s. Numerical coast keeps the exponential Mars atmosphere." : coast === "kepler" ? "Kepler coast is armed, but the surface engine is still burning, so this run stays on RK4." : mode === "vacuum" ? "Mars selected with gravity and atmosphere off. Pure +Y thrust for 60 seconds." : "Mars surface. μ = 4.282837×10¹³ m³/s², ρ = 0.020 exp(−h / 11,100). Pure +Y thrust for 60 seconds. J2 is off." : report.analyticKepler ? program === "pitch" ? "Cutoff at 60 s, then a drag-free Kepler arc to 120 s. Horizontal speed and flight-path angle follow the captured orbit. Energy stays constant." : mode === "vacuum" ? "Cutoff at 60 s. With gravity off the analytic step is a straight line at constant speed." : "Cutoff at 60 s on the verified Earth burn, then universal-variable Kepler to 120 s. Drag is zero after the element capture." : engine === "cutoff" ? program === "pitch" ? "Pitch-over, then cutoff at 60 s. Coast to 120 s. Horizontal speed remains after the engine stops." : mode === "vacuum" ? "Cutoff at 60 s with gravity and atmosphere off. The coast is a straight constant-velocity line." : "Cutoff at 60 s. Thrust and mass flow stop. Coast to 120 s under gravity and drag." : program === "pitch" ? mode === "vacuum" ? "Pitch program with gravity and atmosphere off. Thrust stays +Y for 20 s, then leaves it at 1.0 deg/s." : "Open-loop pitch: inertial +Y for 20 s, then 1.0 deg/s toward +X." : coast === "kepler" ? "Kepler coast is armed, but thrust is still commanded, so this run stays on the verified RK4 burn." : mode === "vacuum" ? "Gravity and atmosphere are off. Inertial speed must match the ideal rocket equation within 0.1%." : "Sea-level Earth, point-mass gravity, exponential air. 100% thrust along inertial +Y for 90 seconds.",
								weathercock || pitchErrorDeg > 0 || controller || gimbalDeg > 0 || bodyRate === 0 ? "" : bodyAxis === "tumble" ? mode === "vacuum" ? ` Torque-free tumble at ${bodyRate.toFixed(2)} rad/s on a 50 m × ${CYLINDER_RADIUS_M} m cylinder. External torque is zero. ωx and ωz exchange while ωy holds. |L| is conserved at constant mass. Translation matches ω = 0.` : ` Tumble at ${bodyRate.toFixed(2)} rad/s. ωy holds. In vacuum the exchange is torque-free. In air the center of pressure, ${COP_AXIAL_OFFSET_M} m aft, adds a restoring Mz when the nose leaves the velocity vector.` : mode === "vacuum" ? ` Principal spin ${bodyRate.toFixed(2)} rad/s about body +${bodyAxis.toUpperCase()}. External torque is zero, so this rate stays on the axis. Translation matches ω = 0.` : ` Principal spin ${bodyRate.toFixed(2)} rad/s about body +${bodyAxis.toUpperCase()}. The rate stays on the axis while the angle of attack is zero. A lateral velocity brings in the restoring aero moment.`,
								pitchErrorDeg > 0 ? ` ${controller ? "Attitude hold" : "Open loop"} from a ${pitchErrorDeg}° pitch error. δ = −(1 θ + ${ATTITUDE_KD} ωz), stopped at ±${(GIMBAL_LIMIT_RAD * 180 / Math.PI).toFixed(0)}°. A zero error leaves the sealed burn unchanged. Controller off forces δ = 0.` : weathercock ? ` Engines off, gravity off, sea-level air. The nose starts 5° off a 100 m/s +Y velocity. The center of pressure is ${COP_AXIAL_OFFSET_M} m aft of the CoM, so a positive angle of attack produces a negative Mz and the nose weathervanes back through zero. Vacuum and zero angle of attack leave the translational baselines unchanged.` : !controller && gimbalDeg > 0 ? ` Gimbal ${gimbalDeg.toFixed(2)}° from body +Y toward +X${bodyRate > 0 ? `, with the ${bodyRate.toFixed(2)} rad/s body rate still on the vehicle` : ""}. Thrust acts 25 m aft of the CoM, so M = r × F and αz = Mz / Izz from rest. Zero gimbal restores the torque-free model and the translational baselines.` : controller ? " Pitch hold is armed. δ = −(Kp θ + Kd ωz) about body Z, clamped to ±5°. With no pitch error and no body rate the command is zero and the burn matches the sealed baseline." : ""
							]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: clsx("shrink-0 rounded-md border px-3 py-2 text-right", vacuumSeal.vacuumCheckPassed ? "border-primary" : "border-border"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs tracking-widest text-muted uppercase",
								children: "Vacuum seal"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 font-mono text-lg tabular-nums text-fg",
								children: formatAgreement(vacuumSeal.relativeError)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs tracking-widest text-primary uppercase",
								children: [vacuumSeal.vacuumCheckPassed ? "Pass" : "Fail", " · 0.1% limit"]
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-48",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Body"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Primary body",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "earth",
								onClick: () => setBody("earth"),
								children: "Earth"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "mars",
								onClick: () => setBody("mars"),
								children: "Mars"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Start"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Initial state",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "mars" && origin === "surface",
								disabled: body !== "mars",
								onClick: () => setOrigin("surface"),
								children: "Surface"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "mars" && origin === "entry",
								disabled: body !== "mars",
								onClick: () => setOrigin("entry"),
								children: "Entry"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-72",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Terminal"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Terminal sequence",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
									active: !terminalLive || terminal === "off",
									disabled: !terminalLive,
									onClick: () => setTerminal("off"),
									children: "Off"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
									active: terminalLive && terminal === "default",
									disabled: !terminalLive,
									onClick: () => setTerminal("default"),
									children: "3 km"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
									active: terminalLive && terminal === "early",
									disabled: !terminalLive,
									onClick: () => setTerminal("early"),
									children: "5 km"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-56",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Horiz"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Landing horizontal fraction",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
									active: !horizLive || horizontal === 0,
									disabled: !horizLive,
									onClick: () => setHorizontal(0),
									children: "0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
									active: horizLive && horizontal === .3,
									disabled: !horizLive,
									onClick: () => setHorizontal(.3),
									children: "0.3"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
									active: horizLive && horizontal === .6,
									disabled: !horizLive,
									onClick: () => setHorizontal(.6),
									children: "0.6"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-48",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Guidance"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Landing guidance",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: !terminalArmed || guidance === "fixed",
								disabled: !terminalArmed,
								onClick: () => setGuidance("fixed"),
								children: "Fixed"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: terminalArmed && guidance === "proportional",
								disabled: !terminalArmed,
								onClick: () => setGuidance("proportional"),
								children: "Prop"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Entry"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Entry interface preset",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: !terminalLive || !entryTuned,
								disabled: !terminalLive,
								onClick: () => {
									setEntrySpeed(6e3);
									setEntryPropellant(5e4);
									setEntryGamma(-12);
								},
								children: "6 km/s"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: terminalLive && entrySpeed === 3500 && entryPropellant === 2e5 && entryGamma === -12,
								disabled: !terminalLive,
								onClick: () => {
									setEntrySpeed(3500);
									setEntryPropellant(2e5);
									setEntryGamma(-12);
								},
								children: "3.5 km/s"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberField, {
						label: "Speed m/s",
						value: entrySpeed,
						disabled: !terminalLive,
						onCommit: (next) => {
							if (next > 0 && next <= 12e3) setEntrySpeed(next);
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberField, {
						label: "Propellant kg",
						value: entryPropellant,
						disabled: !terminalLive,
						onCommit: (next) => {
							if (next >= 0 && next <= 2e6) setEntryPropellant(next);
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberField, {
						label: "Gamma deg",
						value: entryGamma,
						disabled: !terminalLive,
						onCommit: (next) => {
							if (next >= -90 && next <= 90) setEntryGamma(next);
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Environment"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Environment",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: mode === "earth",
								onClick: () => setMode("earth"),
								children: body === "mars" ? "Mars" : "Earth"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: mode === "vacuum",
								onClick: () => setMode("vacuum"),
								children: "Vacuum"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-56",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Thrust program"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Thrust program",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "mars" ? origin === "surface" : program === "vertical",
								disabled: body === "mars",
								onClick: () => setProgram("vertical"),
								children: "Vertical"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "mars" ? false : program === "pitch",
								disabled: body === "mars",
								onClick: () => setProgram("pitch"),
								children: "1°/s"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-52",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Engine"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Engine cutoff",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "mars" ? origin === "surface" : engine === "burn",
								disabled: body === "mars",
								onClick: () => setEngine("burn"),
								children: "Burn"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: body === "mars" ? false : engine === "cutoff",
								disabled: body === "mars",
								onClick: () => setEngine("cutoff"),
								children: "Cut 60 s"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Coast"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Coast propagator",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: terminalArmed ? true : coast === "numerical",
								disabled: terminalArmed,
								onClick: () => setCoast("numerical"),
								children: "Numerical"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: terminalArmed ? false : coast === "kepler",
								disabled: terminalArmed,
								onClick: () => setCoast("kepler"),
								children: "Kepler"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "RK4 sub-steps"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "RK4 sub-steps",
							children: [
								1,
								4,
								20
							].map((count) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: substeps === count,
								onClick: () => setSubsteps(count),
								children: `${count}×`
							}, count))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Body rate"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Body angular rate",
							children: [
								0,
								.05,
								.1
							].map((rate) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: bodyRate === rate,
								onClick: () => setBodyRate(rate),
								children: rate === 0 ? "0" : rate.toFixed(2)
							}, rate))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-80",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Rate axis"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Body rate axis",
							children: [
								"x",
								"y",
								"z",
								"tumble"
							].map((axis) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: bodyAxis === axis,
								disabled: bodyRate === 0,
								onClick: () => setBodyAxis(axis),
								children: axis === "tumble" ? "Tumble" : `+${axis.toUpperCase()}`
							}, axis))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Pitch disturbance"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Aerodynamic pitch disturbance",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: !weathercock,
								onClick: () => setWeathercock(false),
								children: "Burn"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: weathercock,
								onClick: () => setWeathercock(true),
								children: "5° coast"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Attitude hold"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Attitude controller",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: controller,
								onClick: () => setController(true),
								children: "On"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: !controller,
								onClick: () => setController(false),
								children: "Off"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Pitch error"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Initial pitch error",
							children: [0, 5].map((angle) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: pitchErrorDeg === angle,
								onClick: () => setPitchErrorDeg(angle),
								children: angle === 0 ? "0°" : "5°"
							}, angle))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:w-64",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs tracking-widest text-muted uppercase",
							children: "Gimbal"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border",
							role: "radiogroup",
							"aria-label": "Gimbal deflection",
							children: [
								0,
								.01,
								.02
							].map((angle) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
								active: gimbalDeg === angle,
								disabled: controller,
								onClick: () => setGimbalDeg(angle),
								children: angle === 0 ? "0°" : `${angle.toFixed(2)}°`
							}, angle))
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-5 grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs tracking-widest text-muted uppercase",
								children: "Mission elapsed"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 font-mono text-3xl tabular-nums text-fg",
								children: ["T+ ", formatMet(frame.timeS)]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs tracking-widest text-primary uppercase",
									children: "Engine on"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 font-mono text-sm tabular-nums text-fg",
									children: frame.sequencePhase ? frame.impactFlag === "nominal" ? "Touchdown · nominal" : frame.impactFlag === "RUD" ? "Touchdown · RUD" : frame.sequencePhase === "LandingBurn" ? proportional ? `Prop · hf ${formatFixed(frame.horizontalFraction ?? 0, 2)}` : fixedFraction > 0 ? `Aim · ${formatFixed(frame.thrustPitchFromVerticalDeg ?? 0, 1)}° off up` : `Vertical · ${formatFixed(frame.thrustN / 15e6 * 100, 0)}%` : frame.sequencePhase === "Flip" ? `Flip · ${formatFixed(frame.thrustPitchFromVerticalDeg ?? 0, 1)}° from up` : frame.sequencePhase === "Complete" ? "Sequence complete" : "Coast · thrust 0" : frame.engineState === 0 ? "Cutoff · thrust 0" : frame.thrustPitchDeg === 0 ? "+Y · 100%" : `${formatFixed(frame.thrustPitchDeg, 2)}° from +Y`
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs tracking-widest text-muted uppercase",
									children: "Altitude"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 font-mono text-4xl leading-none tabular-nums text-fg sm:text-5xl",
									children: formatFixed(frame.altitudeM, 1)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 text-sm text-muted",
									children: frame.impactFlag ? "impact altitude clamped at the spherical surface" : "meters above the spherical surface"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 grid grid-cols-2 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs tracking-widest text-muted uppercase",
									children: "Inertial speed"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 font-mono text-2xl tabular-nums text-fg",
									children: formatFixed(frame.speedMps, 2)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm text-muted",
									children: "m/s"
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs tracking-widest text-muted uppercase",
									children: frame.sequencePhase ? "Radial" : "Vertical"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 font-mono text-2xl tabular-nums text-fg",
									children: formatFixed(frame.sequencePhase ? frame.radialMps ?? 0 : frame.verticalMps, 2)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm text-muted",
									children: frame.sequencePhase ? "m/s · up" : "m/s · +Y"
								})
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
								label: "Propellant remaining",
								right: `${formatFixed(frame.propellantKg, 0)} kg`,
								fraction: propellantFraction
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs tracking-widest text-muted uppercase",
							children: terminalArmed ? proportional ? terminal === "early" ? "Mars terminal · 5 km · proportional" : "Mars terminal · 3 km · proportional" : fixedFraction > 0 ? terminal === "early" ? `Mars terminal · 5 km · hf ${formatFixed(fixedFraction, 1)}` : `Mars terminal · 3 km · 60% · hf ${formatFixed(fixedFraction, 1)}` : terminal === "early" ? "Mars terminal · 5 km · 100%" : "Mars terminal · 3 km · 60%" : body === "mars" ? origin === "entry" ? report.disableGravityAndAtmosphere ? "Mars entry · vacuum · 300 s" : report.analyticKepler ? "Mars entry · Kepler · 300 s" : "Mars entry · numerical · 300 s" : report.disableGravityAndAtmosphere ? "Mars vacuum · vertical 60 s" : "Mars surface · vertical 60 s" : report.analyticKepler ? report.pitchProgram ? "Kepler coast · pitched cutoff" : "Kepler coast · vertical cutoff" : report.cutoff ? report.pitchProgram ? "Pitched cutoff · coast 120 s" : "Cutoff 60 s · coast 120 s" : report.pitchProgram ? report.disableGravityAndAtmosphere ? "Pitched vacuum · 90 s" : "Pitched Earth · 90 s" : report.disableGravityAndAtmosphere ? "Vacuum check · 90 s" : "Earth burn · 90 s"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 text-xl text-fg",
							children: "Delta-v closure"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 grid grid-cols-1 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeltaRow, {
									label: "Ideal rocket",
									value: formatFixed(report.idealDeltaVMps, 3),
									unit: "m/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeltaRow, {
									label: "Integrated thrust",
									value: formatFixed(report.thrustIntegratedDeltaVMps, 3),
									unit: "m/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeltaRow, {
									label: "Inertial |Δv|",
									value: formatFixed(report.achievedDeltaVMps, 3),
									unit: "m/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeltaRow, {
									label: "Ideal − inertial",
									value: formatTiny(report.differenceMps, 3, "m/s").replace(/ m\/s$/, ""),
									unit: "m/s"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
								label: "Inertial share of ideal",
								right: formatFixed(Math.min(achievedShare, 1) * 100, 2) + "%",
								fraction: achievedShare
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-sm text-pretty text-muted",
							children: terminalArmed ? report.terminal?.impact ? `Impact ${report.terminal.impact.flag}. Radial ${formatFixed(report.terminal.impact.verticalMps, 1)} m/s, horizontal ${formatFixed(report.terminal.impact.horizontalMps, 1)} m/s, kinetic energy ${report.terminal.impact.kineticEnergyJ.toExponential(3)} J. The impact altitude is clamped at 0.${proportional ? " The landing fraction follows horizontal speed." : fixedFraction > 0 ? ` Landing fraction ${formatFixed(fixedFraction, 1)} opposes horizontal velocity.` : ""}` : "The sequence reached the time limit without meeting the spherical surface." : body === "mars" ? origin === "entry" ? report.analyticKepler ? "Engines are off from the interface. Semi-major axis and eccentricity freeze at capture. Drag, density, and dynamic pressure are zero on the Kepler arc." : report.disableGravityAndAtmosphere ? "No thrust, no gravity, no air. Speed stays 6,000 m/s and the flight-path angle stays −12°." : "No thrust. Altitude falls under Mars gravity. Density follows ρ0 exp(−h / H) while the vehicle is still above the surface." : "Ideal minus inertial speed is Mars gravity and drag. Integrated thrust still matches the rocket equation. μ/R² is about 3.73 m/s²." : report.analyticKepler ? "After cutoff the state is a two-body arc. Semi-major axis and eccentricity are frozen at capture. Drag, density, and dynamic pressure are zero on that arc even if Earth air is selected." : report.cutoff ? "Thrust and mass flow are zero after cutoff. Ideal Δv uses only the propellant burned before cutoff. Integrated thrust stops with the engine." : report.pitchProgram ? "Ideal minus inertial speed includes gravity, drag, and the turn. Integrated thrust is still the rocket-equation impulse." : report.disableGravityAndAtmosphere ? `Inertial speed agrees with Isp·g0·ln(m0/mf) to ${formatAgreement(report.relativeError)}. Limit is 0.100%.` : `Ideal minus inertial speed is the gravity and drag loss. Integrated thrust still matches the rocket equation, because mass flow does not depend on the trajectory.`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-mono text-xs tracking-widest text-primary uppercase",
							children: terminalArmed ? report.terminal?.impact?.flag === "nominal" ? "Verdict · nominal touchdown" : report.terminal?.impact ? "Verdict · RUD" : "Verdict · no impact" : body === "mars" ? origin === "entry" ? report.analyticKepler ? "Verdict · analytic Kepler" : "Verdict · Mars entry" : "Verdict · Mars surface burn" : report.analyticKepler ? "Verdict · analytic Kepler" : report.cutoff ? "Verdict · cutoff and coast" : report.pitchProgram ? "Verdict · open-loop pitch" : report.vacuumCheckApplies ? report.vacuumCheckPassed ? "Verdict · pass" : "Verdict · fail" : "Verdict · gravity and drag loss"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-md border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-xs tracking-widest text-muted uppercase",
							htmlFor: "burn-scrub",
							children: "Scrub the burn"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: replay,
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Replay"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "burn-scrub",
						type: "range",
						min: 0,
						max: Math.max(0, report.frames.length - 1),
						step: 1,
						value: frameIndex,
						"aria-valuetext": `T+ ${formatMet(frame.timeS)}`,
						onChange: (event) => {
							stopPlayback();
							setIndex(Number(event.target.value));
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between font-mono text-xs tabular-nums text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatTick(0) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatTick(report.endTimeS / 2) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatTick(report.endTimeS) })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex items-baseline justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-sm tracking-widest text-muted uppercase",
								children: "Trajectory"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3 font-mono text-xs text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-primary",
									children: "Altitude km"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fg",
									children: "Speed m/s"
								})]
							})]
						}),
						chartReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BurnChart, {
							data: chartData,
							timeS: frame.timeS
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex h-52 items-end border-b border-border text-sm text-muted",
							children: "Altitude and speed"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex items-center gap-4 border-t border-border pt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttitudeTriad, {
								w: frame.quaternionW,
								x: frame.quaternionX,
								y: frame.quaternionY,
								z: frame.quaternionZ
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs tracking-widest text-muted uppercase",
										children: "Attitude"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 font-mono text-sm tabular-nums text-fg",
										children: [
											frame.quaternionW.toFixed(6),
											" ",
											frame.quaternionX.toFixed(6),
											" ",
											frame.quaternionY.toFixed(6),
											" ",
											frame.quaternionZ.toFixed(6)
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-muted",
										children: "w · x · y · z · body to inertial"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-2 font-mono text-sm tabular-nums text-fg",
										children: [
											"θ ",
											formatFixed(frame.rotationAngleRad * 180 / Math.PI, 3),
											"°",
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "ml-2 text-muted",
												children: [frame.rotationAngleRad.toFixed(6), " rad"]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 font-mono text-xs tabular-nums text-muted",
										children: [
											"|ω| ",
											frame.angularVelocityRadS.toFixed(6),
											" rad/s",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mx-1",
												children: "·"
											}),
											"ω ",
											frame.omegaBodyX.toFixed(4),
											" ",
											frame.omegaBodyY.toFixed(4),
											" ",
											frame.omegaBodyZ.toFixed(4)
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 font-mono text-xs tabular-nums text-muted",
										children: [
											"|L| ",
											formatFixed(frame.angularMomentumKgM2S, 0),
											" kg·m²/s",
											momentumStart > 0 ? ` · L/m drift ${specificVectorDrift.toExponential(1)}` : bodyRate === 0 ? " · ω = 0 baseline" : ""
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 font-mono text-xs tabular-nums text-muted",
										children: [
											"θ ",
											formatFixed(frame.pitchAngleRad * 180 / Math.PI, 3),
											"°",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mx-1",
												children: "·"
											}),
											"δ ",
											formatFixed(frame.gimbalRad * 180 / Math.PI, 3),
											"°",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mx-1",
												children: "·"
											}),
											"Mz ",
											formatFixed(frame.momentZ, 0),
											" N·m"
										]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid min-w-0 grid-cols-2 gap-x-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Acceleration",
									value: formatFixed(frame.accelMps2, 3),
									unit: "m/s²"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Gravity",
									value: formatFixed(frame.gravityMps2, 4),
									unit: "m/s²"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Thrust",
									value: formatFixed(frame.thrustN, 0),
									unit: "N"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Drag",
									value: formatFixed(frame.dragN, 1),
									unit: "N"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Dynamic pressure",
									value: formatFixed(frame.dynamicPressurePa, 1),
									unit: "Pa"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Density",
									value: formatDensity(frame.densityKgM3),
									unit: "kg/m³"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Body",
									value: frame.body,
									unit: "primary"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Mach",
									value: formatFixed(frame.mach, 3),
									unit: frame.body === "Mars" ? "a = 240 m/s" : "a = 340 m/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Mass",
									value: formatFixed(frame.totalMassKg, 1),
									unit: "kg"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Mass flow",
									value: formatFixed(mdot, 2),
									unit: "kg/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "T / W₀",
									value: formatFixed(tw, 3),
									unit: "g0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Propellant",
									value: formatFixed(frame.propellantKg, 1),
									unit: "kg"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Horizontal speed",
									value: formatFixed(frame.horizontalMps, 2),
									unit: "m/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Flight-path angle",
									value: formatFixed(frame.flightPathDeg, 2),
									unit: "deg"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Thrust pitch",
									value: formatFixed(frame.thrustPitchDeg, 2),
									unit: "deg from +Y"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Radius",
									value: formatFixed(frame.radiusM, 1),
									unit: "m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Quaternion w",
									value: formatFixed(frame.quaternionW, 6),
									unit: "scalar"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Quaternion x",
									value: formatFixed(frame.quaternionX, 6),
									unit: "i"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Quaternion y",
									value: formatFixed(frame.quaternionY, 6),
									unit: "j"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Quaternion z",
									value: formatFixed(frame.quaternionZ, 6),
									unit: "k"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Body rate",
									value: formatFixed(frame.angularVelocityRadS, 6),
									unit: "rad/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "ωx",
									value: formatFixed(frame.omegaBodyX, 6),
									unit: "rad/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "ωy",
									value: formatFixed(frame.omegaBodyY, 6),
									unit: "rad/s · axial"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "ωz",
									value: formatFixed(frame.omegaBodyZ, 6),
									unit: "rad/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Angular momentum",
									value: formatFixed(frame.angularMomentumKgM2S, 0),
									unit: "kg·m²/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "L inertial x",
									value: formatFixed(frame.angularMomentumInertialX, 0),
									unit: "kg·m²/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "L inertial y",
									value: formatFixed(frame.angularMomentumInertialY, 0),
									unit: "kg·m²/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "L inertial z",
									value: formatFixed(frame.angularMomentumInertialZ, 0),
									unit: "kg·m²/s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Ixx = Izz",
									value: formatFixed(frame.inertiaIxx, 0),
									unit: "kg·m²"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Iyy",
									value: formatFixed(frame.inertiaIyy, 0),
									unit: "kg·m² · axial"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Pitch error",
									value: formatFixed(frame.pitchAngleRad * 180 / Math.PI, 3),
									unit: "deg about Z"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Gimbal command",
									value: formatFixed(frame.gimbalRad * 180 / Math.PI, 3),
									unit: controller ? "PD · ±5°" : "open loop"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Angle of attack",
									value: formatFixed(frame.angleOfAttackRad * 180 / Math.PI, 3),
									unit: "deg"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Aero moment z",
									value: formatFixed(frame.aeroMomentZ, 0),
									unit: "N·m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Gimbal",
									value: formatFixed(frame.gimbalRad * 180 / Math.PI, 3),
									unit: "deg from +Y"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Moment z",
									value: formatFixed(frame.momentZ, 0),
									unit: "N·m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "αz",
									value: formatFixed(frame.alphaZ, 6),
									unit: "rad/s²"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Rotation angle",
									value: formatFixed(frame.rotationAngleRad * 180 / Math.PI, 3),
									unit: "deg from initial"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Engine state",
									value: frame.engineState === 1 ? "1" : "0",
									unit: frame.engineState === 1 ? "thrusting" : "cutoff"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Since cutoff",
									value: formatFixed(frame.timeSinceCutoffS, 2),
									unit: "s"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Specific energy",
									value: frame.specificEnergyM2S2.toExponential(4),
									unit: "m²/s²"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Propagation",
									value: frame.propagationMode === "analytic" ? "Analytic" : "Numerical",
									unit: frame.propagationMode === "analytic" ? "Kepler" : "RK4"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Semi-major axis",
									value: frame.timeSinceElementsS > 0 || frame.semiMajorAxisM !== 0 ? formatAxis(frame.semiMajorAxisM) : "—",
									unit: "m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Eccentricity",
									value: frame.timeSinceElementsS > 0 || frame.eccentricity !== 0 ? formatFixed(frame.eccentricity, 6) : "—",
									unit: "e"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
									label: "Since elements",
									value: formatFixed(frame.timeSinceElementsS, 2),
									unit: "s"
								}),
								frame.sequencePhase ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Phase",
										value: frame.sequencePhase,
										unit: "terminal"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Pitch from vertical",
										value: formatFixed(frame.thrustPitchFromVerticalDeg ?? 0, 2),
										unit: "deg"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Impact",
										value: frame.impactFlag ? frame.impactFlag : "—",
										unit: frame.impactFlag ? "touchdown" : "in flight"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Impact energy",
										value: frame.impactFlag && frame.impactKineticEnergyJ !== void 0 ? frame.impactKineticEnergyJ.toExponential(3) : "—",
										unit: "J"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Peak speed",
										value: formatFixed(frame.peakSpeedMps ?? 0, 1),
										unit: "m/s"
									}),
									proportional ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Guidance",
										value: "Proportional",
										unit: "k · vh / vref"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Horiz fraction",
										value: formatFixed(frame.horizontalFraction ?? 0, 3),
										unit: "commanded"
									})] }) : fixedFraction > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Channel, {
										label: "Horiz fraction",
										value: formatFixed(frame.horizontalFraction ?? 0, 2),
										unit: frame.sequencePhase === "LandingBurn" || frame.impactFlag ? "commanded" : "coast"
									}) : null
								] }) : null
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-border bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm tracking-widest text-muted uppercase",
							children: "Five-second log"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: copyLog,
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
								className: "size-4",
								"aria-hidden": "true"
							}), copied ? "Copied" : "Copy"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-2 max-h-[64rem] overflow-y-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex justify-between gap-3 font-mono text-xs tracking-widest text-muted uppercase",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Met" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Altitude" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Speed" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "θ" }),
								report.terminal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Phase" }) : null
							]
						}), report.samples.map((sample, sampleIndex) => {
							const selected = sample.timeS === activeSample.timeS;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									stopPlayback();
									setIndex(nearestFrameIndex(report.frames, sample.timeS));
								},
								className: clsx("flex min-h-11 w-full items-baseline justify-between gap-3 border-t border-border py-2.5 text-left font-mono text-sm tabular-nums", selected ? "text-primary" : "text-fg"),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMet(sample.timeS) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: selected ? "text-primary" : "text-muted",
										children: [formatFixed(sample.altitudeM, 0), " m"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatFixed(sample.speedMps, 1) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: selected ? "text-primary" : "text-muted",
										children: [formatFixed(sample.rotationAngleRad * 180 / Math.PI, 2), "°"]
									}),
									report.terminal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: selected ? "text-primary" : "text-muted",
										children: phaseLabel(sample.sequencePhase)
									}) : null
								]
							}) }, `${sample.timeS}-${sampleIndex}`);
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-md border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm tracking-widest text-muted uppercase",
						children: "Pass 1 model"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-3 grid gap-2 font-mono text-sm text-fg sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "a = g(r) + T/m + D/m" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "g = −μ r / |r|³" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "D = ½ ρ v² Cd A" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "ρ = ρ0 exp(−h / H)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "ṁ = T / (Isp g0)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Δv = Isp g0 ln(m0 / mf)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "q̇ = ½ q ⊗ ω" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "I ω̇ + ω × Iω = M" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "δ = −(Kp θ + Kd ωz)" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "μ Earth",
								v: "3.986004418×10¹⁴ m³/s²"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "R",
								v: "6,371,000 m"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "ρ0 / H",
								v: "1.225 kg/m³ · 8,500 m"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Thrust",
								v: "15,000,000 N vac"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Isp / g0",
								v: "380 s · 9.80665 m/s²"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Cd / A",
								v: "0.50 · 60 m²"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Dry mass",
								v: "120,000 kg"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Propellant",
								v: "1,200,000 kg"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Step",
								v: "RK4 · 0.02 s"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Cylinder",
								v: `50 m · R ${CYLINDER_RADIUS_M} m`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Inertia",
								v: "Iyy = ½mR² · Ixx = Izz"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Torque",
								v: gimbalDeg === 0 ? "M = 0" : "M = r × F"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Hold",
								v: controller ? `Kp 1 · Kd ${ATTITUDE_KD} s` : "controller off"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "CoP",
								v: `${COP_AXIAL_OFFSET_M} m aft of CoM`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
								k: "Offset",
								v: `25 m aft of CoM`
							}),
							body === "mars" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
									k: "μ Mars",
									v: "4.282837×10¹³ m³/s²"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
									k: "R Mars",
									v: "3,389,500 m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
									k: "ρ0 / H Mars",
									v: "0.020 kg/m³ · 11,100 m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
									k: "Entry",
									v: "125 km · 6,000 m/s · −12°"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
									k: "Entry propellant",
									v: "50,000 kg"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
									k: "Sound Mars",
									v: "240 m/s"
								}),
								terminalArmed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
										k: "Flip",
										v: "60% until within 5° of vertical"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
										k: "Landing thrust",
										v: terminal === "early" ? "100% after alignment" : "60% after alignment"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
										k: "Nominal",
										v: "|vrad| ≤ 2 · vh ≤ 0.5 m/s"
									}),
									proportional ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
										k: "Guidance",
										v: "proportional · k = 1"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
										k: "vref / max",
										v: "500 m/s · 0.75"
									})] }) : fixedFraction > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
										k: "Horiz fraction",
										v: `${formatFixed(fixedFraction, 1)} · anti-vh`
									}) : null,
									entryTuned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Const, {
										k: "Entry",
										v: `${formatFixed(entrySpeed, 0)} m/s · ${formatFixed(entryPropellant, 0)} kg`
									}) : null
								] }) : null
							] }) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-4 text-sm text-pretty text-muted",
						children: ["No wind, no planetary rotation. The vehicle is a uniform cylinder, 50 m tall and 4.5 m in radius, so the inertia tensor scales with the current mass. The nozzle sits half a length aft of the center of mass. A pitch loop commands the gimbal, δ = −(Kp θ + Kd ωz), and stops it at ±5°. Controller off, or a zero pitch error with zero rate, leaves that command at zero and the translational burn unchanged. The center of pressure sits a quarter length aft, so a positive angle of attack produces a negative restoring moment. That moment is identically zero in vacuum and at zero angle of attack, and it is not added to the translational force. Set the controller off and the gimbal and body rate to 0 to reproduce every translational baseline. J2 is implemented and left off for this verification. g0 defines exhaust velocity only. Local gravity is μ/r², about 9.820 m/s² at the surface with these constants. Cutoff sets thrust and mass flow to zero. Numerical coast keeps RK4, including drag on Earth. Analytic Kepler replaces that coast with a universal-variable step and zero drag. The Unity scripts are the same core and do not call PhysX. Leave Analytic Kepler off to reproduce the verified burn numbers.", terminalArmed ? proportional ? " The flip is a powered pitch loop on body Z, Mars entry only. Proportional mode sets the landing-burn horizontal share from current horizontal speed after the nose is within 5° of vertical. Locking the gimbal leaves the vehicle unaligned and the impact is a RUD." : fixedFraction > 0 ? " The flip is a powered pitch loop on body Z, Mars entry only. After alignment the landing burn mixes local up with a share opposing horizontal velocity. Set Horiz to 0 for a vertical landing burn." : " The flip holds 60% thrust along body +Y. Gimbal deflection is −(Kp θ + Kd ωz), stopped at ±5°, and the landing burn waits until the nose is within 5° of local vertical. An impact before that gate is a RUD. Leave Terminal off to keep the Pass 1–5 numbers." : body === "mars" ? " Mars uses the same integrator. Surface gravity is μ/R², about 3.73 m/s². The entry start does not change any Earth run." : ""]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-md border border-border bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm tracking-widest text-muted uppercase",
						children: "Unity drop-in"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "C# 9 for Unity 2022 LTS / 2023 LTS. Namespaces MarsMission.Math and MarsMission.PhysicsCore."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: "/pass1/AresCore-Pass1.zip",
						download: true,
						className: "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-bg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
							className: "size-4",
							"aria-hidden": "true"
						}), "Download scripts"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 grid gap-2",
					children: SOURCE_FILES.map((file) => {
						const name = file.split("/").pop() ?? file;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "min-w-0 border-t border-border pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								className: "block min-w-0",
								href: `/pass1/${file}`,
								download: true,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-sm text-fg",
									children: name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-0.5 block font-mono text-xs break-all text-muted",
									children: file
								})]
							})
						}, file);
					})
				})]
			})
		]
	});
}
function AttitudeTriad({ w, x, y, z }) {
	const bodyX = {
		x: 1 - 2 * (y * y + z * z),
		y: 2 * (x * y + z * w)
	};
	const bodyY = {
		x: 2 * (x * y - z * w),
		y: 1 - 2 * (x * x + z * z)
	};
	const bodyZ = {
		x: 2 * (x * z + y * w),
		y: 2 * (y * z - x * w)
	};
	const s = 42;
	const cx = 56;
	const cy = 56;
	const tip = (axis) => ({
		x: cx + axis.x * s,
		y: cy - axis.y * s
	});
	const xTip = tip(bodyX);
	const yTip = tip(bodyY);
	const zTip = tip(bodyZ);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 112 112",
		className: "size-28 shrink-0",
		role: "img",
		"aria-label": "Body axes in the inertial frame",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx,
				cy,
				r: "46",
				fill: "none",
				stroke: "currentColor",
				className: "text-border"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: 10,
				y1: cy,
				x2: 102,
				y2: cy,
				stroke: "currentColor",
				className: "text-border"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: cx,
				y1: 10,
				x2: cx,
				y2: 102,
				stroke: "currentColor",
				className: "text-border"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AxisLine, {
				x1: cx,
				y1: cy,
				x2: zTip.x,
				y2: zTip.y,
				label: "Z",
				color: "#8e968f"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AxisLine, {
				x1: cx,
				y1: cy,
				x2: xTip.x,
				y2: xTip.y,
				label: "X",
				color: "#e07a3d"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AxisLine, {
				x1: cx,
				y1: cy,
				x2: yTip.x,
				y2: yTip.y,
				label: "Y",
				color: "#ebe6dc"
			})
		]
	});
}
function AxisLine({ x1, y1, x2, y2, label, color }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
			x1,
			y1,
			x2,
			y2,
			stroke: color,
			strokeWidth: "2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: x2,
			cy: y2,
			r: "2.5",
			fill: color
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
			x: x2 + (x2 >= x1 ? 4 : -10),
			y: y2 + (y2 >= y1 ? 10 : -4),
			fill: color,
			fontSize: "9",
			fontFamily: "IBM Plex Mono, ui-monospace, monospace",
			children: label
		})
	] });
}
function formatAxis(value) {
	if (!Number.isFinite(value)) return "inf";
	return formatFixed(value, 0);
}
function phaseLabel(phase) {
	if (phase === "LandingBurn") return "Burn";
	if (phase === "Complete") return "Done";
	return phase ?? "";
}
function NumberField({ label, value, disabled, onCommit }) {
	const [draft, setDraft] = (0, import_react.useState)(String(value));
	(0, import_react.useEffect)(() => {
		setDraft(String(value));
	}, [value]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "min-w-0 sm:w-36",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-2 block text-xs tracking-widest text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "number",
			inputMode: "decimal",
			"aria-label": label,
			disabled,
			value: draft,
			onChange: (event) => setDraft(event.target.value),
			onBlur: () => {
				const next = Number(draft);
				if (Number.isFinite(next)) onCommit(next);
				setDraft(String(value));
			},
			onKeyDown: (event) => {
				if (event.key === "Enter") event.currentTarget.blur();
			},
			className: clsx("h-11 w-full rounded-md border border-border bg-surface px-2 font-mono text-sm text-fg tabular-nums", disabled && "cursor-not-allowed opacity-40")
		})]
	});
}
function ModeButton({ active, onClick, children, disabled = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "radio",
		"aria-checked": active,
		disabled,
		onClick,
		className: clsx("h-11 px-3 text-sm", disabled && "cursor-not-allowed opacity-40", active ? "bg-primary text-bg" : "bg-surface text-fg"),
		children
	});
}
function DeltaRow({ label, value, unit }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-3 border-t border-border pt-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
			className: "font-mono text-base tabular-nums text-fg",
			children: [value, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-1.5 text-xs text-muted",
				children: unit
			})]
		})]
	});
}
function Const({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-border pt-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs tracking-widest text-muted uppercase",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "mt-1 font-mono text-sm tabular-nums text-fg",
			children: v
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AresInstrument, {});
}
//#endregion
export { Home as component };

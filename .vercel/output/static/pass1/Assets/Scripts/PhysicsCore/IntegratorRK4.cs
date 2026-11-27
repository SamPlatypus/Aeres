using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Fixed-step classical RK4 for translation.
    /// Attitude is torque-free Euler on the same sub-steps, with the cylinder
    /// inertia of the mass at the end of the translational update.
    /// Identically zero rate does not touch the quaternion and does not change
    /// the translational arithmetic.
    /// Independent of PhysX.
    /// </summary>
    public sealed class IntegratorRK4
    {
        public const int StepHz = 50;
        public const double FixedStepSeconds = 1d / 50d;

        private readonly PlanetaryEnvironment _environment;
        private readonly PropulsionModel _propulsion;

        public IntegratorRK4(PlanetaryEnvironment environment, PropulsionModel propulsion)
        {
            if (environment == null) throw new ArgumentNullException("environment");
            if (propulsion == null) throw new ArgumentNullException("propulsion");
            _environment = environment;
            _propulsion = propulsion;
        }

        public PlanetaryEnvironment Environment
        {
            get { return _environment; }
        }

        public PropulsionModel Propulsion
        {
            get { return _propulsion; }
        }

        public ForceEvaluation Evaluate(VehicleState state, double throttle)
        {
            return Evaluate(state.Position, state.Velocity, state.PropellantMassKg, throttle, _propulsion.ThrustDirectionInertial);
        }

        public ForceEvaluation Evaluate(Vector3d position, Vector3d velocity, double propellantKg, double throttle)
        {
            return Evaluate(position, velocity, propellantKg, throttle, _propulsion.ThrustDirectionInertial);
        }

        public ForceEvaluation Evaluate(Vector3d position, Vector3d velocity, double propellantKg, double throttle, Vector3d thrustDirection)
        {
            double mass = VehicleState.DryMassKg + (propellantKg > 0d ? propellantKg : 0d);
            double altitude = _environment.AltitudeM(position);
            Vector3d gravity = _environment.GravitationalAcceleration(position);
            double density = _environment.AtmosphericDensityKgM3(position);
            double speed = velocity.Magnitude;
            double dynamicPressure = 0.5d * density * speed * speed;

            double dragN = 0d;
            Vector3d dragAccel = Vector3d.Zero;
            if (speed > 0d && density > 0d && _propulsion.DragCd > 0d && _propulsion.DragAreaM2 > 0d)
            {
                dragN = dynamicPressure * _propulsion.DragCd * _propulsion.DragAreaM2;
                dragAccel = velocity * (-dragN / (speed * mass));
            }

            double thrustN = _propulsion.ThrustMagnitudeN(throttle, propellantKg);
            Vector3d thrustAccel = thrustDirection * (thrustN / mass);
            Vector3d acceleration = gravity + thrustAccel + dragAccel;

            return new ForceEvaluation
            {
                AltitudeM = altitude,
                MassKg = mass,
                Acceleration = acceleration,
                AccelerationMagnitudeMps2 = acceleration.Magnitude,
                ThrustN = thrustN,
                ThrustAccelMps2 = mass > 0d ? thrustN / mass : 0d,
                DragN = dragN,
                GravityMps2 = gravity.Magnitude,
                DensityKgM3 = density,
                DynamicPressurePa = dynamicPressure,
                MassFlowKgS = _propulsion.MassFlowKgS(throttle, propellantKg)
            };
        }

        /// <summary>
        /// Advance by dt seconds, split into substeps equal RK4 stages.
        /// </summary>
        public void Step(VehicleState state, double dt, int substeps, double throttle)
        {
            Step(state, dt, substeps, throttle, _propulsion.ThrustDirectionInertial);
        }

        /// <summary>
        /// Advance by dt seconds. Thrust direction is held constant across the step and its sub-steps.
        /// Pass 1 calls the overload that uses the stage +Y direction.
        /// </summary>
        public void Step(VehicleState state, double dt, int substeps, double throttle, Vector3d thrustDirection)
        {
            if (state == null) throw new ArgumentNullException("state");
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");
            if (!(dt > 0d)) return;

            double h = dt / substeps;
            for (int i = 0; i < substeps; i++)
            {
                double stageThrottle = PropulsionModel.IsFiring(throttle, state.PropellantMassKg) ? throttle : 0d;
                StepOne(state, h, stageThrottle, thrustDirection);
            }
        }

        private void StepOne(VehicleState state, double dt, double throttle, Vector3d thrustDirection)
        {
            if (state.PropellantMassKg <= 0d || !(throttle > 0d))
            {
                if (state.PropellantMassKg < 0d) state.PropellantMassKg = 0d;
                state.TotalMassKg = VehicleState.DryMassKg + state.PropellantMassKg;
                Rk4(state, dt, 0d, thrustDirection);
                return;
            }

            double mdot = _propulsion.MassFlowKgS(throttle, state.PropellantMassKg);
            if (mdot > 0d && state.PropellantMassKg < mdot * dt)
            {
                double dtBurn = state.PropellantMassKg / mdot;
                if (dtBurn > 0d) Rk4(state, dtBurn, throttle, thrustDirection);
                state.PropellantMassKg = 0d;
                state.TotalMassKg = VehicleState.DryMassKg;
                double dtCoast = dt - dtBurn;
                if (dtCoast > 1e-12d) Rk4(state, dtCoast, 0d, thrustDirection);
                return;
            }

            Rk4(state, dt, throttle, thrustDirection);
        }

        private void Rk4(VehicleState state, double dt, double throttle, Vector3d thrustDirection)
        {
            Vector3d direction = thrustDirection;
            double gimbal = AttitudeController.EffectiveGimbal(state);
            if (gimbal != 0d && throttle > 0d)
            {
                direction = state.Attitude.Rotate(CylinderInertia.BodyThrustDirection(gimbal));
            }

            Vector3d r0 = state.Position;
            Vector3d v0 = state.Velocity;
            double p0 = state.PropellantMassKg;
            double s0 = state.ThrustIntegratedDeltaVMps;
            Vector3d aero = state.FlipHold
                ? Vector3d.Zero
                : AeroMoment.Moment(state.Attitude, v0, _environment.AtmosphericDensityKgM3(r0));

            Deriv k1 = DerivOf(r0, v0, p0, throttle, direction);
            Deriv k2 = DerivOf(
                r0 + k1.Dr * (dt * 0.5d),
                v0 + k1.Dv * (dt * 0.5d),
                p0 + k1.DPropellant * (dt * 0.5d),
                throttle,
                direction);
            Deriv k3 = DerivOf(
                r0 + k2.Dr * (dt * 0.5d),
                v0 + k2.Dv * (dt * 0.5d),
                p0 + k2.DPropellant * (dt * 0.5d),
                throttle,
                direction);
            Deriv k4 = DerivOf(
                r0 + k3.Dr * dt,
                v0 + k3.Dv * dt,
                p0 + k3.DPropellant * dt,
                throttle,
                direction);

            double scale = dt / 6d;
            state.Position = r0 + (k1.Dr + 2d * k2.Dr + 2d * k3.Dr + k4.Dr) * scale;
            state.Velocity = v0 + (k1.Dv + 2d * k2.Dv + 2d * k3.Dv + k4.Dv) * scale;
            state.PropellantMassKg = p0 + (k1.DPropellant + 2d * k2.DPropellant + 2d * k3.DPropellant + k4.DPropellant) * scale;
            state.ThrustIntegratedDeltaVMps = s0 + (k1.DThrustDeltaV + 2d * k2.DThrustDeltaV + 2d * k3.DThrustDeltaV + k4.DThrustDeltaV) * scale;

            if (state.PropellantMassKg < 0d) state.PropellantMassKg = 0d;
            state.TotalMassKg = VehicleState.DryMassKg + state.PropellantMassKg;

            bool aeroOn = aero.X != 0d || aero.Y != 0d || aero.Z != 0d;
            if (!aeroOn)
            {
                if (gimbal != 0d)
                {
                    double thrust = _propulsion.ThrustMagnitudeN(throttle, state.PropellantMassKg);
                    Vector3d moment = CylinderInertia.GimbalMoment(thrust, gimbal);
                    if (moment.SqrMagnitude != 0d || !QuaternionD.AngularVelocityIsZero(state.AngularVelocityBody))
                    {
                        QuaternionD attitude = state.Attitude;
                        Vector3d omega = state.AngularVelocityBody;
                        CylinderInertia.IntegrateRk4(ref attitude, ref omega, state.TotalMassKg, dt, moment);
                        state.Attitude = attitude;
                        state.AngularVelocityBody = omega;
                    }
                }
                else if (!QuaternionD.AngularVelocityIsZero(state.AngularVelocityBody))
                {
                    QuaternionD attitude = state.Attitude;
                    Vector3d omega = state.AngularVelocityBody;
                    CylinderInertia.IntegrateRk4(ref attitude, ref omega, state.TotalMassKg, dt);
                    state.Attitude = attitude;
                    state.AngularVelocityBody = omega;
                }
            }
            else
            {
                Vector3d moment = aero;
                if (gimbal != 0d)
                {
                    double thrust = _propulsion.ThrustMagnitudeN(throttle, state.PropellantMassKg);
                    Vector3d thrustMoment = CylinderInertia.GimbalMoment(thrust, gimbal);
                    moment = new Vector3d(thrustMoment.X + aero.X, thrustMoment.Y + aero.Y, thrustMoment.Z + aero.Z);
                }
                QuaternionD attitude = state.Attitude;
                Vector3d omega = state.AngularVelocityBody;
                CylinderInertia.IntegrateRk4(ref attitude, ref omega, state.TotalMassKg, dt, moment);
                state.Attitude = attitude;
                state.AngularVelocityBody = omega;
            }
        }

        private Deriv DerivOf(Vector3d position, Vector3d velocity, double propellantKg, double throttle, Vector3d thrustDirection)
        {
            ForceEvaluation force = Evaluate(position, velocity, propellantKg, throttle, thrustDirection);
            return new Deriv
            {
                Dr = velocity,
                Dv = force.Acceleration,
                DPropellant = -force.MassFlowKgS,
                DThrustDeltaV = force.ThrustAccelMps2
            };
        }

        private struct Deriv
        {
            public Vector3d Dr;
            public Vector3d Dv;
            public double DPropellant;
            public double DThrustDeltaV;
        }
    }

    public struct ForceEvaluation
    {
        public double AltitudeM;
        public double MassKg;
        public Vector3d Acceleration;
        public double AccelerationMagnitudeMps2;
        public double ThrustN;
        public double ThrustAccelMps2;
        public double DragN;
        public double GravityMps2;
        public double DensityKgM3;
        public double DynamicPressurePa;
        public double MassFlowKgS;
    }
}

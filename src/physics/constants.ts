/** Standard gravity. Converts Isp to exhaust velocity. Not local gravitational acceleration. */
export const G0_MPS2 = 9.80665;

export const DRY_MASS_KG = 120_000;
export const INITIAL_PROPELLANT_KG = 1_200_000;
export const INITIAL_MASS_KG = DRY_MASS_KG + INITIAL_PROPELLANT_KG;

export const MAX_VACUUM_THRUST_N = 15_000_000;
export const VACUUM_ISP_S = 380;

export const DRAG_CD = 0.5;
export const DRAG_AREA_M2 = 60;

/** Fixed major step. 1/50 s = 0.02 s, so step index / STEP_HZ is exact at log marks. */
export const STEP_HZ = 50;
export const FIXED_DT_S = 1 / STEP_HZ;
export const BURN_DURATION_S = 90;
export const LOG_INTERVAL_S = 5;

export const EARTH_MU_M3_S2 = 3.986004418e14;
export const EARTH_RADIUS_M = 6_371_000;
export const EARTH_RHO0_KG_M3 = 1.225;
export const EARTH_SCALE_HEIGHT_M = 8_500;
/** Earth J2. Stored for later passes. The Pass 1 verification leaves it off. */
export const EARTH_J2 = 1.08262668e-3;

export const MARS_MU_M3_S2 = 4.282837e13;
export const MARS_RADIUS_M = 3_389_500;
export const MARS_RHO0_KG_M3 = 0.02;
export const MARS_SCALE_HEIGHT_M = 11_100;
export const MARS_J2 = 1.96045e-3;

/** Local speed-of-sound approximation for Mach. Not a thermodynamic model. */
export const EARTH_SPEED_OF_SOUND_MPS = 340;
export const MARS_SPEED_OF_SOUND_MPS = 240;

/** Mars entry interface. Used only when that start is selected. */
export const MARS_ENTRY_ALTITUDE_M = 125_000;
export const MARS_ENTRY_SPEED_MPS = 6_000;
export const MARS_ENTRY_FLIGHT_PATH_DEG = -12;
export const MARS_ENTRY_PROPELLANT_KG = 50_000;
export const MARS_SURFACE_BURN_S = 60;
export const MARS_ENTRY_END_S = 300;

/** Powered terminal sequence. Used only when that mode is armed on a Mars entry. */
export const TERMINAL_TRIGGER_ALTITUDE_M = 3_000;
export const TERMINAL_FLIP_DURATION_S = 8;
export const TERMINAL_FLIP_THROTTLE = 0.6;
export const TERMINAL_LANDING_THROTTLE = 0.6;
export const TERMINAL_NOMINAL_VERTICAL_MPS = 2;
export const TERMINAL_NOMINAL_HORIZONTAL_MPS = 0.5;
export const TERMINAL_EARLY_ALTITUDE_M = 5_000;
export const TERMINAL_EARLY_THROTTLE = 1;
export const TERMINAL_MAX_TIME_S = 2_400;

/** Proportional landing law. Used only when that guidance mode is selected. */
export const TERMINAL_PROPORTIONAL_GAIN = 1;
export const TERMINAL_PROPORTIONAL_VREF_MPS = 500;
export const TERMINAL_MAX_HORIZONTAL_FRACTION = 0.75;

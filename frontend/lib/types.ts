/**
 * JAEL Type Definitions
 *
 * These types define the data contract between the backend (webcam tracking + game logic)
 * and the frontend (3D character rendering).
 *
 * ARMS (shoulder + elbow angles):
 *   - Shoulder angle: angle between torso and upper arm, in degrees.
 *       0° = arm hanging at side, 90° = arm horizontal, 180° = arm overhead.
 *       Measured in the frontal plane, rotating outward/upward.
 *   - Elbow angle: non-reflex angle between upper arm and forearm, in degrees.
 *       0° = fully bent (forearm folded against upper arm),
 *       180° = fully extended (straight arm).
 *
 * FEET:
 *   - 5 grid positions: T, L, M, R, B (cross pattern, no diagonals)
 *   - Both feet can only overlap when both are M (middle/neutral)
 *   - T (back): heel stance
 *   - L, M, R (middle row): flat foot
 *   - B (front): toe stance
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type GridPosition = 'T' | 'L' | 'M' | 'R' | 'B';

export type HandPoseType =
  | 'open'    // All fingers extended (5)
  | 'fist'    // All fingers curled
  | 'peace'   // Index + middle extended (2)
  | 'one'     // Index extended (1)
  | 'three'   // Index + middle + ring extended (3)
  | 'four'    // All except thumb extended (4)
  | 'heart'   // Korean finger heart
  | 'flat'    // Fingers together, flat palm
  | 'pointing'; // Index extended forward

// ---------------------------------------------------------------------------
// PoseInput — the JSON payload from the backend
// ---------------------------------------------------------------------------

/**
 * The complete pose snapshot sent from the backend to the frontend.
 * This is the single entry-point for all pose data. The backend sends one of
 * these each frame (or on change), and the frontend applies it to the 3D model.
 *
 * Example JSON:
 * ```json
 * {
 *   "leftShoulderAngle":  30,
 *   "rightShoulderAngle": 30,
 *   "leftElbowAngle":     150,
 *   "rightElbowAngle":    150,
 *   "leftHandShape":      "open",
 *   "rightHandShape":     "fist",
 *   "leftFoot":           "M",
 *   "rightFoot":          "R"
 * }
 * ```
 */
export interface PoseInput {
  leftShoulderAngle: number;   // Degrees, 0=arm at side, 180=overhead
  rightShoulderAngle: number;  // Degrees, 0=arm at side, 180=overhead
  leftElbowAngle: number;     // Degrees, 0=fully bent, 180=fully extended
  rightElbowAngle: number;    // Degrees, 0=fully bent, 180=fully extended
  leftHandShape: HandPoseType;   // Left hand finger pose
  rightHandShape: HandPoseType;  // Right hand finger pose
  leftFoot: GridPosition;        // Left foot grid position
  rightFoot: GridPosition;       // Right foot grid position
}

// ---------------------------------------------------------------------------
// Internal state (mirrors PoseInput + provides individual setters for UI)
// ---------------------------------------------------------------------------

export type PoseState = PoseInput;

export interface PoseActions {
  /** Apply an entire pose snapshot from the backend (batch update, single re-render). */
  setPose: (input: PoseInput) => void;

  // Individual setters (used by the test ControlPanel UI)
  setLeftFoot: (pos: GridPosition) => void;
  setRightFoot: (pos: GridPosition) => void;
  setLeftHandShape: (pose: HandPoseType) => void;
  setRightHandShape: (pose: HandPoseType) => void;
  setLeftShoulderAngle: (angle: number) => void;
  setRightShoulderAngle: (angle: number) => void;
  setLeftElbowAngle: (angle: number) => void;
  setRightElbowAngle: (angle: number) => void;
}

// ---------------------------------------------------------------------------
// Hand pose internals (finger joint definitions)
// ---------------------------------------------------------------------------

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface FingerJointPose {
  curl: number;   // Flexion angle in radians (positive = curl inward)
  spread: number; // Abduction angle in radians (positive = spread apart)
  twist?: number; // Roll/twist angle in radians (thumb only — rotates bone around its axis)
}

export interface FingerPose {
  joint1: FingerJointPose; // Proximal (closest to palm)
  joint2: FingerJointPose; // Intermediate
  joint3: FingerJointPose; // Distal (fingertip)
}

export type HandPoseDefinition = Record<FingerName, FingerPose>;

// ---------------------------------------------------------------------------
// Pose sequence — timestamped keyframes for animation playback
// ---------------------------------------------------------------------------

/** A single pose snapshot at a specific point in time. */
export interface PoseKeyframe {
  time: number;       // Seconds from start of sequence
  pose: PoseInput;
}

/** An ordered sequence of timestamped pose keyframes. */
export type PoseSequence = PoseKeyframe[];

// ---------------------------------------------------------------------------
// Arrow sequences — timestamped directions for R/L foot lanes
// ---------------------------------------------------------------------------

/** A single arrow note in a foot lane. */
export interface ArrowNote {
  time: number;              // Seconds from start
  direction: GridPosition;   // Which arrow to show
}

/** An ordered sequence of arrow notes for one foot lane. */
export type ArrowSequence = ArrowNote[];

/** A timed hand instruction shown in the HANDS lane. */
export interface HandCue {
  time: number;    // Seconds from start
  label: string;   // Display text, e.g. "L: open | R: fist"
}

/** Ordered hand instruction sequence for the HANDS lane. */
export type HandCueSequence = HandCue[];

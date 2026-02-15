/**
 * Constants for the JAEL 3D character model.
 *
 * BONE NAMING CONVENTION — why the "mixamorig6" prefix exists:
 *   The 3D model (character-timmy.glb) was rigged using Adobe Mixamo, which
 *   names every bone with the prefix "mixamorig6:" (e.g., "mixamorig6:Hips").
 *   When Three.js loads the GLB file, it STRIPS the colon from node names,
 *   so at runtime the bones are named "mixamorig6Hips", "mixamorig6LeftArm", etc.
 *
 *   These string constants are REQUIRED — Three.js looks up bones by exact
 *   string match. They are defined here ONCE and the rest of the codebase
 *   uses the structured objects (ARM_BONE_NAMES, LEG_BONE_NAMES, etc.)
 *   so you never need to type "mixamorig6..." anywhere else.
 *
 * PHYSICAL DIMENSIONS:
 *   All measurements are in the 3D model's world units after scaling the
 *   model to TARGET_HEIGHT (160 units ≈ 160 cm). These were measured from
 *   the actual bone positions after loading and scaling the GLB file.
 */

import type { GridPosition, FingerName } from './types';

// ---------------------------------------------------------------------------
// Physical dimensions (world units, after scaling to 160-unit character height)
// ---------------------------------------------------------------------------

/** Horizontal distance from foot center to side step position. */
export const STEP_WIDTH = 20;

/** Forward/backward distance from foot center to front/back step position. */
export const STEP_DEPTH = 25;

/** Y position of the hip joint (center of gravity). */
export const HIP_HEIGHT = 64.03;

/** Y position of the shoulder joints. */
export const SHOULDER_HEIGHT = 96;

/** X offset of each shoulder from body center. */
export const SHOULDER_WIDTH = 17;

/**
 * Total arm reach (upper arm + forearm bone lengths).
 * At normalized input = 1.0, the hand is ARM_LENGTH from the shoulder.
 */
export const ARM_LENGTH = 45.0;

/** Default Z position for hands/elbows (no depth from 2D camera). */
export const DEFAULT_HAND_Z = 15;

/** Total leg length (upper leg + lower leg bone lengths). */
export const LEG_LENGTH = 47.3;

/**
 * Half the natural stance width. Each foot is offset by this amount from
 * the grid position's X — left foot shifts +X, right foot shifts -X.
 * This prevents feet from overlapping when both are at the same grid column.
 */
export const STANCE_HALF_WIDTH = 8;

// ---------------------------------------------------------------------------
// Foot grid positions (X, Z offsets from body center at ground level)
// ---------------------------------------------------------------------------

/**
 * Maps each 3x3 grid label to world-space X and Z offsets.
 * Labels are from the CHARACTER's perspective (character faces +Z toward camera).
 *
 * Character's left = +X world (viewer's screen right — mirror effect)
 * Character's right = -X world (viewer's screen left)
 *
 *   TL  T  TR     (front — toward camera, +Z)
 *    L  M   R     (center)
 *   BL  B  BR     (back — away from camera, -Z)
 */
export const GRID_WORLD_POSITIONS: Record<GridPosition, { x: number; z: number }> = {
  TL: { x: STEP_WIDTH,  z: STEP_DEPTH },
  T:  { x: 0,           z: STEP_DEPTH },
  TR: { x: -STEP_WIDTH, z: STEP_DEPTH },
  L:  { x: STEP_WIDTH,  z: 0 },
  M:  { x: 0,           z: 0 },
  R:  { x: -STEP_WIDTH, z: 0 },
  BL: { x: STEP_WIDTH,  z: -STEP_DEPTH },
  B:  { x: 0,           z: -STEP_DEPTH },
  BR: { x: -STEP_WIDTH, z: -STEP_DEPTH },
};

// ---------------------------------------------------------------------------
// Bone name constants (Mixamo rig — see header comment for naming explanation)
// ---------------------------------------------------------------------------

type Side = 'left' | 'right';

const fingerNames: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const fingerCapitals: Record<FingerName, string> = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  pinky: 'Pinky',
};

function buildFingerBoneNames(side: Side): Record<FingerName, string[]> {
  const sideCapital = side === 'left' ? 'Left' : 'Right';
  const result = {} as Record<FingerName, string[]>;
  for (const finger of fingerNames) {
    const cap = fingerCapitals[finger];
    result[finger] = [
      `mixamorig6${sideCapital}Hand${cap}1`,
      `mixamorig6${sideCapital}Hand${cap}2`,
      `mixamorig6${sideCapital}Hand${cap}3`,
    ];
  }
  return result;
}

export const FINGER_BONE_NAMES: Record<Side, Record<FingerName, string[]>> = {
  left: buildFingerBoneNames('left'),
  right: buildFingerBoneNames('right'),
};

export const ARM_BONE_NAMES: Record<Side, { upper: string; lower: string; hand: string; shoulder: string }> = {
  left: {
    shoulder: 'mixamorig6LeftShoulder',
    upper: 'mixamorig6LeftArm',
    lower: 'mixamorig6LeftForeArm',
    hand: 'mixamorig6LeftHand',
  },
  right: {
    shoulder: 'mixamorig6RightShoulder',
    upper: 'mixamorig6RightArm',
    lower: 'mixamorig6RightForeArm',
    hand: 'mixamorig6RightHand',
  },
};

export const LEG_BONE_NAMES: Record<Side, { upper: string; lower: string; foot: string }> = {
  left: {
    upper: 'mixamorig6LeftUpLeg',
    lower: 'mixamorig6LeftLeg',
    foot: 'mixamorig6LeftFoot',
  },
  right: {
    upper: 'mixamorig6RightUpLeg',
    lower: 'mixamorig6RightLeg',
    foot: 'mixamorig6RightFoot',
  },
};

export const SPINE_BONE_NAMES = {
  hips: 'mixamorig6Hips',
  spine: 'mixamorig6Spine',
  spine1: 'mixamorig6Spine1',
  spine2: 'mixamorig6Spine2',
};

// ---------------------------------------------------------------------------
// UI labels (used by ControlPanel — test-only, removable)
// ---------------------------------------------------------------------------

export const GRID_LABELS: GridPosition[] = ['TL', 'T', 'TR', 'L', 'M', 'R', 'BL', 'B', 'BR'];

export const HAND_POSE_LABELS: Record<string, string> = {
  open: 'Open (5)',
  fist: 'Fist',
  peace: 'Peace (2)',
  one: 'One (1)',
  three: 'Three (3)',
  four: 'Four (4)',
  heart: 'Heart',
  flat: 'Flat',
  pointing: 'Point',
};

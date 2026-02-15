import type { HandPoseType, HandPoseDefinition } from '../types';

// ---------------------------------------------------------------------------
// Reusable finger configurations
// ---------------------------------------------------------------------------

// Thumb tucked against curled fingers (fist, 1, 2, 3, 4, pointing).
// Thumb faces opposite direction from other fingers, so negative curl on X
// flexes toward palm. Strong negative spread adducts against palm.
const THUMB_FIST = {
  joint1: { curl: -1.5, spread: -1.2 },  // Metacarpal: fold hard across palm
  joint2: { curl: -1.8, spread: -0.5 },  // Proximal: deep bend into palm
  joint3: { curl: -1.2, spread: 0 },     // Distal: curl tip tight
};

// Thumb extended straight for thumbs up pose.
const THUMB_UP = {
  joint1: { curl: 0.0, spread: 0.4 },   // Metacarpal: spread away from palm
  joint2: { curl: 0.0, spread: 0 },     // Proximal: straight
  joint3: { curl: 0.0, spread: 0 },     // Distal: straight
};

// Thumb tucked to the side (flat palm, pointing poses)
const THUMB_SIDE = {
  joint1: { curl: -0.2, spread: 0.3 },  // Metacarpal: fold in, spread out
  joint2: { curl: -0.1, spread: 0 },    // Proximal: barely bent
  joint3: { curl: 0.0, spread: 0 },     // Distal: straight
};

// Fully curled finger (used for inactive fingers in numbered poses)
const FINGER_CURLED = {
  joint1: { curl: 1.5, spread: 0.0 },
  joint2: { curl: 1.6, spread: 0 },
  joint3: { curl: 1.2, spread: 0 },
};

// Straight finger (base for extended fingers)
const FINGER_STRAIGHT = {
  joint1: { curl: 0.0, spread: 0.0 },
  joint2: { curl: 0.0, spread: 0 },
  joint3: { curl: 0.0, spread: 0 },
};

// ---------------------------------------------------------------------------
// Hand pose definitions
// ---------------------------------------------------------------------------

/** All fingers extended, slight natural spread. */
const OPEN: HandPoseDefinition = {
  thumb:  { joint1: { curl: 0.0, spread: 0.3 },  joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  index:  { joint1: { curl: 0.0, spread: 0.1 },  joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  middle: { ...FINGER_STRAIGHT },
  ring:   { joint1: { curl: 0.0, spread: -0.1 }, joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  pinky:  { joint1: { curl: 0.0, spread: -0.2 }, joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
};

/** All fingers and thumb curled tightly. Thumb rests alongside curled fingers. */
const FIST: HandPoseDefinition = {
  thumb:  { ...THUMB_FIST },
  index:  { ...FINGER_CURLED },
  middle: { ...FINGER_CURLED },
  ring:   { ...FINGER_CURLED },
  pinky:  { ...FINGER_CURLED },
};

/**
 * Peace / V sign: index + middle extended with spread for V shape.
 * Thumb folded alongside. Ring + pinky curled.
 */
const PEACE: HandPoseDefinition = {
  thumb:  { ...THUMB_FIST },
  index:  { joint1: { curl: 0.0, spread: 0.5 },  joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  middle: { joint1: { curl: 0.0, spread: -0.5 }, joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  ring:   { ...FINGER_CURLED },
  pinky:  { ...FINGER_CURLED },
};

/** One finger: index extended. Thumb folded alongside. */
const ONE: HandPoseDefinition = {
  thumb:  { ...THUMB_FIST },
  index:  { ...FINGER_STRAIGHT },
  middle: { ...FINGER_CURLED },
  ring:   { ...FINGER_CURLED },
  pinky:  { ...FINGER_CURLED },
};

/** Three fingers: index + middle + ring extended. Thumb folded alongside. */
const THREE_POSE: HandPoseDefinition = {
  thumb:  { ...THUMB_FIST },
  index:  { joint1: { curl: 0.0, spread: 0.1 },  joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  middle: { ...FINGER_STRAIGHT },
  ring:   { joint1: { curl: 0.0, spread: -0.1 }, joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  pinky:  { ...FINGER_CURLED },
};

/** Four fingers: all except thumb extended. Thumb folded alongside. */
const FOUR: HandPoseDefinition = {
  thumb:  { ...THUMB_FIST },
  index:  { joint1: { curl: 0.0, spread: 0.1 },  joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  middle: { joint1: { curl: 0.0, spread: 0.05 }, joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  ring:   { joint1: { curl: 0.0, spread: -0.05 },joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
  pinky:  { joint1: { curl: 0.0, spread: -0.1 }, joint2: { curl: 0.0, spread: 0 }, joint3: { curl: 0.0, spread: 0 } },
};

/**
 * Thumbs up: thumb extended, all four fingers fully curled.
 */
const THUMBS_UP: HandPoseDefinition = {
  thumb:  { ...THUMB_UP },
  index:  { ...FINGER_CURLED },
  middle: { ...FINGER_CURLED },
  ring:   { ...FINGER_CURLED },
  pinky:  { ...FINGER_CURLED },
};

/** Flat palm: all fingers together, thumb tucked to the side. */
const FLAT: HandPoseDefinition = {
  thumb:  { ...THUMB_SIDE },
  index:  { ...FINGER_STRAIGHT },
  middle: { ...FINGER_STRAIGHT },
  ring:   { ...FINGER_STRAIGHT },
  pinky:  { ...FINGER_STRAIGHT },
};

/** Pointing: index extended, rest curled. Thumb folded alongside. */
const POINTING: HandPoseDefinition = {
  thumb:  { ...THUMB_FIST },
  index:  { ...FINGER_STRAIGHT },
  middle: { ...FINGER_CURLED },
  ring:   { ...FINGER_CURLED },
  pinky:  { ...FINGER_CURLED },
};

// ---------------------------------------------------------------------------
// Export map
// ---------------------------------------------------------------------------

export const HAND_POSES: Record<HandPoseType, HandPoseDefinition> = {
  open: OPEN,
  fist: FIST,
  peace: PEACE,
  one: ONE,
  three: THREE_POSE,
  four: FOUR,
  heart: THUMBS_UP,
  flat: FLAT,
  pointing: POINTING,
};

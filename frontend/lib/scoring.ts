import { PoseInput } from './types';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type Score = 'PERFECT' | 'GREAT' | 'GOOD' | 'OKAY' | 'MISS';

export interface ScoreResult {
  score: Score;
  details: {
    leftArm: Score;
    rightArm: Score;
    leftHand: boolean;
    rightHand: boolean;
  };
  totalPoints: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Angle tolerances in degrees.
// We keep a wider "PERFECT" window to tolerate webcam jitter/noise.
const TOLERANCE = {
  PERFECT: 25,
  GREAT: 38,
  GOOD: 50,
  OKAY: 58,
};

/** Above this average error (deg), arm scoring is always zero. */
const MAX_SCORABLE_DIFF = 75;
const MAX_POINTS_PER_MOVE = 100;

// ---------------------------------------------------------------------------
// Geometric Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates the angle (in degrees) at point B formed by points A-B-C.
 * Returns a value between 0 and 180.
 */
export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
}

/**
 * Normalizes an angle to be relative to the vertical body axis if needed.
 * For shoulder angle: 0 = down, 90 = horizontal, 180 = up.
 * 
 * Note: MediaPipe coordinates have y increasing downwards.
 */
export function normalizeShoulderAngle(
  shoulder: { x: number; y: number },
  elbow: { x: number; y: number },
  hip: { x: number; y: number }
): number {
  // Vector from shoulder to hip (reference vertical down)
  const verticalVector = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };
  // Vector from shoulder to elbow
  const armVector = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };

  // Calculate angle between vertical vector and arm vector
  const dotProduct = verticalVector.x * armVector.x + verticalVector.y * armVector.y;
  const mag1 = Math.sqrt(verticalVector.x ** 2 + verticalVector.y ** 2);
  const mag2 = Math.sqrt(armVector.x ** 2 + armVector.y ** 2);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosTheta = dotProduct / (mag1 * mag2);
  // Clamp to [-1, 1] to avoid NaN due to floating point errors
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));
  
  return (Math.acos(clampedCos) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Comparison Logic
// ---------------------------------------------------------------------------

function getScoreForDiff(diff: number): Score {
  if (diff <= TOLERANCE.PERFECT) return 'PERFECT';
  if (diff <= TOLERANCE.GREAT) return 'GREAT';
  if (diff <= TOLERANCE.GOOD) return 'GOOD';
  if (diff <= TOLERANCE.OKAY) return 'OKAY';
  return 'MISS';
}

export function comparePose(target: PoseInput, detected: Partial<PoseInput>): ScoreResult {
  // Compare arms (shoulder + elbow)
  const armDiff = (
    targetShoulder: number, targetElbow: number,
    detectedShoulder?: number, detectedElbow?: number
  ): number | null => {
    if (detectedShoulder === undefined || detectedElbow === undefined) return null;

    const shoulderDiff = Math.abs(targetShoulder - detectedShoulder);
    const elbowDiff = Math.abs(targetElbow - detectedElbow);
    return shoulderDiff * 0.6 + elbowDiff * 0.4;
  };

  const leftDiff = armDiff(
    target.leftShoulderAngle, target.leftElbowAngle,
    detected.leftShoulderAngle, detected.leftElbowAngle
  );
  const rightDiff = armDiff(
    target.rightShoulderAngle, target.rightElbowAngle,
    detected.rightShoulderAngle, detected.rightElbowAngle
  );

  // If any required angle is missing, score nothing.
  if (leftDiff === null || rightDiff === null) {
    return {
      score: 'MISS',
      details: {
        leftArm: 'MISS',
        rightArm: 'MISS',
        leftHand: false,
        rightHand: false,
      },
      totalPoints: 0,
    };
  }

  const leftArmScore = getScoreForDiff(leftDiff);
  const rightArmScore = getScoreForDiff(rightDiff);
  const overallDiff = (leftDiff + rightDiff) / 2;

  // Continuous points from error margin:
  // 0 points at MAX_SCORABLE_DIFF+, up to 100 at 0 diff.
  const normalized = Math.max(0, 1 - overallDiff / MAX_SCORABLE_DIFF);
  // More forgiving curve so moderate matches earn meaningful points.
  const totalPoints = Math.round(MAX_POINTS_PER_MOVE * Math.pow(normalized, 0.9));

  let finalScore: Score = getScoreForDiff(overallDiff);
  if (totalPoints <= 0) finalScore = 'MISS';

  return {
    score: finalScore,
    details: {
      leftArm: leftArmScore,
      rightArm: rightArmScore,
      leftHand: false,
      rightHand: false,
    },
    totalPoints,
  };
}

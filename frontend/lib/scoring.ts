import { HandPoseType, PoseInput } from './types';

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

// Angle tolerances in degrees
const TOLERANCE = {
  PERFECT: 15,
  GREAT: 25,
  GOOD: 40,
  OKAY: 60,
};

const POINTS = {
  PERFECT: 1000,
  GREAT: 500,
  GOOD: 200,
  OKAY: 50,
  MISS: 0,
};

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
// Hand Shape Detection
// ---------------------------------------------------------------------------

/**
 * Simple heuristic to detect hand shape from landmarks.
 * This is a simplified version and would need more robust logic for complex shapes.
 */
export function detectHandShape(landmarks: any[]): HandPoseType {
  if (!landmarks || landmarks.length < 21) return 'open';

  // Helper to check if a finger is extended
  // Tip is higher (lower y value) than PIP joint
  // Note: This assumes hand is upright. For arbitrary rotation, we need vector math.
  // For simplicity, we'll use distance from wrist.
  const wrist = landmarks[0];
  
  const isExtended = (tipIdx: number, pipIdx: number) => {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    // Distance from wrist
    const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    return distTip > distPip * 1.2; // Tip significantly further than PIP
  };

  const thumbOpen = isExtended(4, 2);
  const indexOpen = isExtended(8, 6);
  const middleOpen = isExtended(12, 10);
  const ringOpen = isExtended(16, 14);
  const pinkyOpen = isExtended(20, 18);

  const fingersOpenCount = [indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;

  if (fingersOpenCount === 4 && thumbOpen) return 'open';
  if (fingersOpenCount === 4 && !thumbOpen) return 'four';
  if (fingersOpenCount === 0) return 'fist'; // Thumb can be anywhere for fist usually
  if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) return 'peace';
  if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return 'pointing'; // or 'one'
  if (indexOpen && middleOpen && ringOpen && !pinkyOpen) return 'three';
  if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return 'heart'; // Approximation for thumbs up
  if (!thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return 'fist';

  // Default fallback
  return 'open';
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
  // 1. Compare Arms (Shoulders & Elbows)
  // We'll average the score of shoulder and elbow for each arm
  
  const checkArm = (
    targetShoulder: number, targetElbow: number,
    detectedShoulder?: number, detectedElbow?: number
  ): Score => {
    if (detectedShoulder === undefined || detectedElbow === undefined) return 'MISS';
    
    const shoulderDiff = Math.abs(targetShoulder - detectedShoulder);
    const elbowDiff = Math.abs(targetElbow - detectedElbow);
    
    // Weighted average: shoulder is more important for overall silhouette
    const avgDiff = (shoulderDiff * 0.6 + elbowDiff * 0.4);
    return getScoreForDiff(avgDiff);
  };

  const leftArmScore = checkArm(
    target.leftShoulderAngle, target.leftElbowAngle,
    detected.leftShoulderAngle, detected.leftElbowAngle
  );
  
  const rightArmScore = checkArm(
    target.rightShoulderAngle, target.rightElbowAngle,
    detected.rightShoulderAngle, detected.rightElbowAngle
  );

  // 2. Compare Hands
  const checkHand = (targetShape: HandPoseType, detectedShape?: HandPoseType): boolean => {
    if (!detectedShape) return false;
    // Strict equality for now, could add similarity matrix later
    return targetShape === detectedShape;
  };

  const leftHandMatch = checkHand(target.leftHandShape, detected.leftHandShape);
  const rightHandMatch = checkHand(target.rightHandShape, detected.rightHandShape);

  // Calculate Points
  const scoreToPoints = (s: Score) => POINTS[s];
  
  let currentPoints = 0;
  currentPoints += scoreToPoints(leftArmScore);
  currentPoints += scoreToPoints(rightArmScore);
  currentPoints += leftHandMatch ? 100 : 0; // Bonus for hands
  currentPoints += rightHandMatch ? 100 : 0;

  // Determine Overall Score
  // If any arm is a MISS, the whole pose is a MISS? Or average?
  // Let's go with average-ish logic but biased towards worst performer to encourage precision
  
  const scores = [leftArmScore, rightArmScore];
  let finalScore: Score = 'PERFECT';
  
  // If any miss, it's a miss (or okay at best)
  if (scores.includes('MISS')) finalScore = 'MISS';
  else if (scores.includes('OKAY')) finalScore = 'OKAY';
  else if (scores.includes('GOOD')) finalScore = 'GOOD';
  else if (scores.includes('GREAT')) finalScore = 'GREAT';
  else finalScore = 'PERFECT';

  // Downgrade if hands don't match (optional)
  if ((!leftHandMatch || !rightHandMatch) && finalScore === 'PERFECT') {
    finalScore = 'GREAT';
  }

  return {
    score: finalScore,
    details: {
      leftArm: leftArmScore,
      rightArm: rightArmScore,
      leftHand: leftHandMatch,
      rightHand: rightHandMatch,
    },
    totalPoints: currentPoints,
  };
}

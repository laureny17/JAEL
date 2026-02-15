import { create } from 'zustand';

/**
 * Store for the latest pose detected from the user's webcam.
 *
 * Written to continuously by PoseDetector (every video frame).
 * Read non-reactively via getState() at keyframe-check time so
 * rapid updates don't cause React re-renders.
 */

interface DetectedPose {
  leftShoulderAngle: number | null;
  rightShoulderAngle: number | null;
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  /** performance.now() timestamp of the last successful detection. */
  lastDetectedAt: number;
}

interface DetectedPoseActions {
  setDetectedPose: (pose: Omit<DetectedPose, 'lastDetectedAt'>) => void;
}

export const useDetectedPoseStore = create<DetectedPose & DetectedPoseActions>(
  (set) => ({
    leftShoulderAngle: null,
    rightShoulderAngle: null,
    leftElbowAngle: null,
    rightElbowAngle: null,
    lastDetectedAt: 0,

    setDetectedPose: (pose) =>
      set({
        ...pose,
        lastDetectedAt: performance.now(),
      }),
  }),
);


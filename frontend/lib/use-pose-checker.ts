'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from './game-store';
import { useDetectedPoseStore } from './detected-pose-store';
import { comparePose } from './scoring';
import type { PoseInput, PoseSequence } from './types';

/** How close (in seconds) currentTime must be to a keyframe to trigger a check. */
const HIT_WINDOW = 0.3;
/** Maximum acceptable age of detected pose before we treat it as stale. */
const MAX_DETECTION_STALENESS_MS = 350;

/**
 * Watches the game clock and, at each keyframe timestamp, reads the latest
 * detected pose from the webcam and logs expected-vs-detected angles.
 *
 * Scores each keyframe once per loop by comparing expected-vs-detected pose.
 * The hook resets its "already-checked" set whenever the sequence loops.
 */
export function usePoseChecker(sequence: PoseSequence, paused = false) {
  const checkedRef = useRef<Set<number>>(new Set());

  // Reset on sequence change
  useEffect(() => {
    checkedRef.current = new Set();
  }, [sequence]);

  useEffect(() => {
    if (paused || sequence.length === 0) return;

    let rafId: number;
    let prevTime = -1;

    function tick() {
      const currentTime = useGameStore.getState().currentTime;

      // Detect loop wrap-around (currentTime jumps backwards) → reset
      if (currentTime < prevTime - 0.5) {
        checkedRef.current = new Set();
      }
      prevTime = currentTime;

      // Check each keyframe
      for (let i = 0; i < sequence.length; i++) {
        if (checkedRef.current.has(i)) continue;

        const kf = sequence[i];
        if (Math.abs(currentTime - kf.time) <= HIT_WINDOW) {
          checkedRef.current.add(i);

          const det = useDetectedPoseStore.getState();
          const freshnessMs = performance.now() - det.lastDetectedAt;
          const hasFreshDetection = det.lastDetectedAt > 0 && freshnessMs <= MAX_DETECTION_STALENESS_MS;
          const detectedPose: Partial<PoseInput> = {
            leftShoulderAngle: hasFreshDetection ? (det.leftShoulderAngle ?? undefined) : undefined,
            rightShoulderAngle: hasFreshDetection ? (det.rightShoulderAngle ?? undefined) : undefined,
            leftElbowAngle: hasFreshDetection ? (det.leftElbowAngle ?? undefined) : undefined,
            rightElbowAngle: hasFreshDetection ? (det.rightElbowAngle ?? undefined) : undefined,
          };
          const scoreResult = comparePose(kf.pose, detectedPose);
          useGameStore.getState().addScore(scoreResult.totalPoints);

          const round = (v: number | null) => (v !== null ? Math.round(v) : null);

          console.log(
            `[PoseCheck] Keyframe ${i} @ ${kf.time}s`,
            '\n  Expected →',
            `lShoulder: ${kf.pose.leftShoulderAngle}°`,
            `rShoulder: ${kf.pose.rightShoulderAngle}°`,
            `lElbow: ${kf.pose.leftElbowAngle}°`,
            `rElbow: ${kf.pose.rightElbowAngle}°`,
            '\n  Detected →',
            `lShoulder: ${round(det.leftShoulderAngle)}°`,
            `rShoulder: ${round(det.rightShoulderAngle)}°`,
            `lElbow: ${round(det.leftElbowAngle)}°`,
            `rElbow: ${round(det.rightElbowAngle)}°`,
            `\n  Score: ${scoreResult.score} (+${scoreResult.totalPoints})`,
            `\n  Freshness: ${Math.round(freshnessMs)}ms ago`,
          );
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [sequence, paused]);
}

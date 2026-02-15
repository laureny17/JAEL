'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from './game-store';
import { useDetectedPoseStore } from './detected-pose-store';
import type { PoseSequence } from './types';

/** How close (in seconds) currentTime must be to a keyframe to trigger a check. */
const HIT_WINDOW = 0.3;

/**
 * Watches the game clock and, at each keyframe timestamp, reads the latest
 * detected pose from the webcam and logs expected-vs-detected angles.
 *
 * No scoring yet — this is purely for verifying that detection works.
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
            `\n  Freshness: ${Math.round(performance.now() - det.lastDetectedAt)}ms ago`,
          );
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [sequence, paused]);
}


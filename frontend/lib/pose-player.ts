'use client';

import { useEffect, useRef } from 'react';
import { usePoseStore } from './store';
import { useGameStore } from './game-store';
import type { PoseSequence } from './types';

/**
 * Plays a sequence of timestamped pose keyframes, updating the Zustand store
 * as each keyframe's time is reached. Character.tsx's built-in exponential
 * smoothing handles transitions between poses automatically.
 *
 * The sequence loops when it reaches the end.
 */
export function usePosePlayer(sequence: PoseSequence, paused = false) {
  const startTimeRef = useRef<number | null>(null);
  const lastKeyframeIndexRef = useRef(-1);
  const elapsedRef = useRef(0);

  useEffect(() => {
    lastKeyframeIndexRef.current = -1;
    elapsedRef.current = 0;
    startTimeRef.current = null;
  }, [sequence]);

  useEffect(() => {
    if (sequence.length === 0) return;
    if (paused) return;

    // Total duration = last keyframe's time
    const totalDuration = sequence[sequence.length - 1].time;
    let rafId: number;

    function tick(now: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = now - elapsedRef.current * 1000;
      }

      const elapsedMs = now - startTimeRef.current;
      const elapsedSec = elapsedMs / 1000;
      elapsedRef.current = elapsedSec;

      // Loop: wrap elapsed time around total duration
      const loopedTime = totalDuration > 0
        ? elapsedSec % totalDuration
        : 0;

      // Broadcast current time to game store (read non-reactively by HUD lanes)
      useGameStore.getState().setCurrentTime(loopedTime);

      // Find the most recent keyframe whose time <= loopedTime
      let keyframeIndex = 0;
      for (let i = sequence.length - 1; i >= 0; i--) {
        if (sequence[i].time <= loopedTime) {
          keyframeIndex = i;
          break;
        }
      }

      // Only update the store when the keyframe changes (avoids redundant writes)
      if (keyframeIndex !== lastKeyframeIndexRef.current) {
        lastKeyframeIndexRef.current = keyframeIndex;
        usePoseStore.getState().setPose(sequence[keyframeIndex].pose);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      startTimeRef.current = null;
    };
  }, [sequence, paused]);
}

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { FootIcon } from './FootIcon';
import type { ArrowSequence, HandCueSequence } from '@/lib/types';
import { useGameStore } from '@/lib/game-store';

const SCROLL_SPEED = 120; // pixels per second
const DASH_WIDTH = 12; // px per dash segment
const DASH_GAP = 8;   // px gap between dashes
// Keep the dashed line continuous; arrows cover it with their own background.
const LANE_COLOR = '#462c2d';
const ARROW_SIZE = 56; // px (matches w-14)
const HAND_CUE_WIDTH = 180;
const ICON_POSITIONS = new Set(['T', 'L', 'R', 'B']);

function signedLoopDelta(currentTime: number, eventTime: number, duration: number): number {
  let dt = currentTime - eventTime;
  if (duration <= 0) return dt;
  while (dt > duration / 2) dt -= duration;
  while (dt < -duration / 2) dt += duration;
  return dt;
}

interface LaneDisplayProps {
  rightArrows: ArrowSequence;
  leftArrows: ArrowSequence;
  handCues: HandCueSequence;
  duration: number;
  paused?: boolean;
}

function ArrowLane({
  label,
  arrows,
  duration,
  paused = false,
}: {
  label: string;
  arrows: ArrowSequence;
  duration: number;
  paused?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevCenterRef = useRef<number[]>([]);

  const setRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      iconRefs.current[idx] = el;
    },
    []
  );

  useEffect(() => {
    if (duration === 0) return;

    if (paused) {
      return;
    }

    let rafId: number;

    function tick() {
      const currentTime = useGameStore.getState().currentTime;
      const container = containerRef.current;
      const lane = laneRef.current;
      if (!container || !lane) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const containerWidth = container.clientWidth;
      const midLineX = containerWidth / 2;

      // Scroll dashes to the right (same direction as arrows)
      const bgOffset = currentTime * SCROLL_SPEED;
      lane.style.setProperty('--dash-offset', `${bgOffset}px`);

      // Update arrows
      for (let i = 0; i < arrows.length; i++) {
        const el = iconRefs.current[i];
        if (!el) continue;

        const dt = signedLoopDelta(currentTime, arrows[i].time, duration);
        const centerX = midLineX + dt * SCROLL_SPEED;
        const leftEdge = centerX - ARROW_SIZE / 2;

        const prevCenter = prevCenterRef.current[i];
        const crossedMid = prevCenter !== undefined && prevCenter < midLineX && centerX >= midLineX;
        prevCenterRef.current[i] = centerX;

        if (leftEdge >= -ARROW_SIZE && leftEdge <= containerWidth) {
          el.style.transform = `translateX(${leftEdge}px)`;
          el.style.display = 'block';
          let opacity = 1;
          if (centerX >= midLineX) {
            const t = Math.min(1, (centerX - midLineX) / (containerWidth - midLineX));
            opacity = 0.5 * (1 - t);
          }
          el.style.opacity = `${opacity}`;
        } else {
          el.style.opacity = '0';
          el.style.display = 'none';
        }

        if (crossedMid && sparkRef.current) {
          const count = 5 + Math.floor(Math.random() * 4);
          for (let s = 0; s < count; s++) {
            const spark = document.createElement('span');
            const size = 10 + Math.random() * 14;
            const dx = (Math.random() - 0.5) * 110;
            const dy = (Math.random() - 0.5) * 70;
            const duration = 420 + Math.random() * 320;
            spark.className = 'spark';
            spark.style.setProperty('--spark-size', `${size}px`);
            spark.style.setProperty('--spark-dx', `${dx}px`);
            spark.style.setProperty('--spark-dy', `${dy}px`);
            spark.style.setProperty('--spark-duration', `${duration}ms`);
            spark.style.left = `${midLineX}px`;
            spark.style.top = `50%`;
            sparkRef.current.appendChild(spark);
            window.setTimeout(() => {
              spark.remove();
            }, duration + 50);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [arrows, duration, paused]);

  return (
    <div className="flex items-center h-16">
      <span className="w-36 text-lg font-bold shrink-0 pr-4" style={{ color: LANE_COLOR }}>
        {label}
      </span>
      <div className="relative flex-1 h-full overflow-hidden" ref={containerRef}>
        <div ref={sparkRef} className="absolute inset-0 pointer-events-none z-30" />
        {/* Scrolling dashed line — masked to create holes around arrows */}
        <div ref={laneRef} className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full">
          <div
            className="absolute inset-0"
            style={{
              width: '50%',
              background: `repeating-linear-gradient(to right, ${LANE_COLOR} 0px, ${LANE_COLOR} ${DASH_WIDTH}px, transparent ${DASH_WIDTH}px, transparent ${DASH_WIDTH + DASH_GAP}px)`,
              backgroundPositionX: 'var(--dash-offset)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              left: '50%',
              width: '50%',
              opacity: 0.33,
              background: `repeating-linear-gradient(to right, ${LANE_COLOR} 0px, ${LANE_COLOR} ${DASH_WIDTH}px, transparent ${DASH_WIDTH}px, transparent ${DASH_WIDTH + DASH_GAP}px)`,
              maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
              backgroundPositionX: 'var(--dash-offset)',
            }}
          />
        </div>
        {/* Arrows */}
        {arrows.map((note, i) => {
          if (!ICON_POSITIONS.has(note.direction)) return null;
          return (
          <div
            key={i}
            ref={setRef(i)}
            className="absolute top-1/2 -translate-y-1/2 z-10"
            style={{ opacity: 0 }}
          >
            <div className="rounded" style={{ backgroundColor: '#f8f4f2' }}>
              <FootIcon position={note.direction} />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function HandCueLane({
  label,
  cues,
  duration,
  paused = false,
}: {
  label: string;
  cues: HandCueSequence;
  duration: number;
  paused?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const cueRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevCenterRef = useRef<number[]>([]);
  const setRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      cueRefs.current[idx] = el;
    },
    []
  );

  useEffect(() => {
    if (duration === 0) return;
    if (paused) return;

    let rafId: number;

    function tick() {
      const currentTime = useGameStore.getState().currentTime;
      const container = containerRef.current;
      const lane = laneRef.current;
      if (!lane || !container) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const containerWidth = container.clientWidth;
      const midLineX = containerWidth / 2;

      const bgOffset = currentTime * SCROLL_SPEED;
      lane.style.setProperty('--dash-offset', `${bgOffset}px`);

      for (let i = 0; i < cues.length; i++) {
        const el = cueRefs.current[i];
        if (!el) continue;

        const dt = signedLoopDelta(currentTime, cues[i].time, duration);
        // Hand cue timing: event triggers when the cue's RIGHT edge reaches
        // the center bar (not its center/left edge).
        const rightEdge = midLineX + dt * SCROLL_SPEED;
        const leftEdge = rightEdge - HAND_CUE_WIDTH;
        const centerX = leftEdge + HAND_CUE_WIDTH / 2;
        prevCenterRef.current[i] = centerX;

        if (leftEdge >= -HAND_CUE_WIDTH && leftEdge <= containerWidth) {
          el.style.transform = `translateX(${leftEdge}px)`;
          el.style.display = 'block';
          // Prioritize readability of upcoming cues on the right by drawing
          // farther-right cards above farther-left cards.
          el.style.zIndex = `${1000 + Math.round(centerX)}`;
          let opacity = 1;
          if (centerX >= midLineX) {
            const t = Math.min(1, (centerX - midLineX) / (containerWidth - midLineX));
            opacity = 0.45 * (1 - t);
          }
          el.style.opacity = `${opacity}`;
        } else {
          el.style.opacity = '0';
          el.style.display = 'none';
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [cues, duration, paused]);

  return (
    <div className="flex items-center h-16">
      <span className="w-36 text-lg font-bold shrink-0 pr-4" style={{ color: LANE_COLOR }}>
        {label}
      </span>
      <div ref={containerRef} className="relative flex-1 h-full overflow-hidden">
        <div ref={laneRef} className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full">
          <div
            className="absolute inset-0"
            style={{
              width: '50%',
              background: `repeating-linear-gradient(to right, ${LANE_COLOR} 0px, ${LANE_COLOR} ${DASH_WIDTH}px, transparent ${DASH_WIDTH}px, transparent ${DASH_WIDTH + DASH_GAP}px)`,
              backgroundPositionX: 'var(--dash-offset)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              left: '50%',
              width: '50%',
              opacity: 0.33,
              background: `repeating-linear-gradient(to right, ${LANE_COLOR} 0px, ${LANE_COLOR} ${DASH_WIDTH}px, transparent ${DASH_WIDTH}px, transparent ${DASH_WIDTH + DASH_GAP}px)`,
              maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
              backgroundPositionX: 'var(--dash-offset)',
            }}
          />
        </div>
        {cues.map((cue, i) => (
          <div
            key={`${cue.time}-${cue.label}`}
            ref={setRef(i)}
            className="absolute top-1/2 -translate-y-1/2 z-10 px-3 py-1 rounded-md border text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
            style={{
              width: `${HAND_CUE_WIDTH}px`,
              backgroundColor: '#f8f4f2',
              borderColor: LANE_COLOR,
              color: LANE_COLOR,
              opacity: 0,
            }}
          >
            {cue.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LaneDisplay({ rightArrows, leftArrows, handCues, duration, paused }: LaneDisplayProps) {
  return (
    <div className="absolute bottom-12 left-12 right-12 rounded-2xl flex flex-col justify-center gap-3 px-8 py-5" style={{ backgroundColor: '#f8f4f2', border: `2px solid ${LANE_COLOR}` }}>
      {/* Combined label divider */}
      <div
        className="absolute w-0.5 rounded-full z-0"
        style={{
          left: 'calc(2rem + 9rem)',
          top: '18px',
          bottom: '18px',
          backgroundColor: LANE_COLOR,
        }}
      />
      {/* Center hit line (behind arrows) */}
      <div
        className="absolute w-0.5 rounded-full z-20"
        style={{
          left: 'calc(2rem + 9rem + (100% - 4rem - 9rem) / 2)',
          top: '18px',
          bottom: '18px',
          backgroundColor: LANE_COLOR,
        }}
      />

      <ArrowLane label="RIGHT FOOT" arrows={rightArrows} duration={duration} paused={paused} />
      <ArrowLane label="LEFT FOOT" arrows={leftArrows} duration={duration} paused={paused} />

      <HandCueLane label="HANDS" cues={handCues} duration={duration} paused={paused} />
    </div>
  );
}

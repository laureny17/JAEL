'use client';

import { useEffect, useRef, useCallback } from 'react';
import { FootIcon } from './FootIcon';
import type { ArrowSequence } from '@/lib/types';

const SCROLL_SPEED = 120; // pixels per second
const DASH_WIDTH = 12; // px per dash segment
const DASH_GAP = 8;   // px gap between dashes
// Keep the dashed line continuous; arrows cover it with their own background.
const LANE_COLOR = '#462c2d';
const ARROW_SIZE = 56; // px (matches w-14)
const ICON_POSITIONS = new Set(['T', 'L', 'R', 'B']);

interface LaneDisplayProps {
  rightArrows: ArrowSequence;
  leftArrows: ArrowSequence;
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
  const startTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);

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

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;

      const elapsed = (now - startTimeRef.current) / 1000;
      elapsedRef.current = elapsed;
      const currentTime = elapsed % duration;
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

        let dt = currentTime - arrows[i].time;
        if (dt < 0) dt += duration;

        const leftEdge = dt * SCROLL_SPEED;
        const centerX = leftEdge + ARROW_SIZE / 2;

        const prevCenter = prevCenterRef.current[i];
        const crossedMid = prevCenter !== undefined && prevCenter < midLineX && centerX >= midLineX;
        prevCenterRef.current[i] = centerX;

        if (leftEdge >= 0 && leftEdge <= containerWidth - ARROW_SIZE) {
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

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now() - elapsedRef.current * 1000;
    }
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      startTimeRef.current = null;
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

function DashLane({ label, duration, paused = false }: { label: string; duration: number; paused?: boolean }) {
  const laneRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);

  useEffect(() => {
    if (duration === 0) return;
    if (paused) return;

    let rafId: number;

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;

      const elapsed = (now - startTimeRef.current) / 1000;
      elapsedRef.current = elapsed;
      const currentTime = elapsed % duration;
      const lane = laneRef.current;
      if (!lane) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const bgOffset = currentTime * SCROLL_SPEED;
      lane.style.setProperty('--dash-offset', `${bgOffset}px`);

      rafId = requestAnimationFrame(tick);
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now() - elapsedRef.current * 1000;
    }
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      startTimeRef.current = null;
    };
  }, [duration, paused]);

  return (
    <div className="flex items-center h-16">
      <span className="w-36 text-lg font-bold shrink-0 pr-4" style={{ color: LANE_COLOR }}>
        {label}
      </span>
      <div className="relative flex-1 h-full overflow-hidden">
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
      </div>
    </div>
  );
}

export function LaneDisplay({ rightArrows, leftArrows, duration, paused }: LaneDisplayProps) {
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

      {/* H lane — dashed line only for now */}
      <DashLane label="HANDS" duration={duration} paused={paused} />
    </div>
  );
}

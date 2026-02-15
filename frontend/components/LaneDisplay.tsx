'use client';

import { useEffect, useRef, useCallback } from 'react';
import { FootIcon } from './FootIcon';
import type { ArrowSequence } from '@/lib/types';

const SCROLL_SPEED = 120; // pixels per second

interface LaneDisplayProps {
  rightArrows: ArrowSequence;
  leftArrows: ArrowSequence;
  duration: number;
}

function ArrowLane({
  label,
  color,
  arrows,
  duration,
}: {
  label: string;
  color: string;
  arrows: ArrowSequence;
  duration: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startTimeRef = useRef<number | null>(null);

  const setRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      iconRefs.current[idx] = el;
    },
    []
  );

  useEffect(() => {
    if (arrows.length === 0 || duration === 0) return;

    let rafId: number;

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;

      const elapsed = (now - startTimeRef.current) / 1000;
      const currentTime = elapsed % duration;
      const container = containerRef.current;
      if (!container) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const containerWidth = container.clientWidth;

      for (let i = 0; i < arrows.length; i++) {
        const el = iconRefs.current[i];
        if (!el) continue;

        // How far ahead is this note from current time
        let dt = arrows[i].time - currentTime;
        // Wrap around for looping
        if (dt < -duration / 2) dt += duration;
        if (dt > duration / 2) dt -= duration;

        // x position: notes enter from the left, scroll right toward the hit zone on the right
        // dt > 0 means note is in the future (on the left), dt < 0 means past (right of hit zone)
        const hitZoneX = containerWidth - 60;
        const x = hitZoneX - dt * SCROLL_SPEED;

        if (x > -80 && x < containerWidth + 80) {
          el.style.transform = `translateX(${x}px)`;
          el.style.opacity = '1';
        } else {
          el.style.opacity = '0';
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      startTimeRef.current = null;
    };
  }, [arrows, duration]);

  return (
    <div className="flex items-center h-16">
      <span className={`w-10 text-lg font-bold font-mono ${color} shrink-0`}>
        {label}
      </span>
      <div className="relative flex-1 h-full overflow-hidden" ref={containerRef}>
        {arrows.map((note, i) => (
          <div
            key={i}
            ref={setRef(i)}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ opacity: 0 }}
          >
            <FootIcon position={note.direction} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LaneDisplay({ rightArrows, leftArrows, duration }: LaneDisplayProps) {
  return (
    <div className="absolute bottom-12 left-12 right-12 bg-black/40 backdrop-blur-sm rounded-2xl border border-zinc-700/50 flex flex-col justify-center gap-3 px-8 py-5">
      {/* Hit zone line near the right */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white/30 rounded-full" style={{ right: '60px' }} />

      <ArrowLane label="R" color="text-blue-400" arrows={rightArrows} duration={duration} />
      <ArrowLane label="L" color="text-amber-400" arrows={leftArrows} duration={duration} />

      {/* H lane — placeholder for hands, no icons yet */}
      <div className="flex items-center h-16">
        <span className="w-10 text-lg font-bold font-mono text-emerald-400 shrink-0">H</span>
        <div className="relative flex-1 h-full overflow-hidden">
          <span className="absolute top-1/2 -translate-y-1/2 left-4 text-zinc-600 text-sm font-mono">
            coming soon
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useGameStore } from '@/lib/game-store';

export function ScoreDisplay() {
  const score = useGameStore((s) => s.score);
  const digits = String(score).split('');

  return (
    <div className="absolute top-12 right-12 flex items-center gap-1">
      {digits.map((digit, i) => (
        <img
          key={i}
          src={`/numbers/bubble-${digit}.svg`}
          alt={digit}
          className="h-12 w-auto object-contain"
          draggable={false}
        />
      ))}
    </div>
  );
}

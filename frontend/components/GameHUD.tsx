'use client';

import { ScoreDisplay } from './ScoreDisplay';
import { LaneDisplay } from './LaneDisplay';
import type { ArrowSequence } from '@/lib/types';

interface GameHUDProps {
  rightArrows: ArrowSequence;
  leftArrows: ArrowSequence;
  arrowDuration: number;
  paused?: boolean;
}

export function GameHUD({ rightArrows, leftArrows, arrowDuration, paused }: GameHUDProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <ScoreDisplay />
      <LaneDisplay
        rightArrows={rightArrows}
        leftArrows={leftArrows}
        duration={arrowDuration}
        paused={paused}
      />
    </div>
  );
}

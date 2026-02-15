'use client';

import { Scene } from '@/components/Scene';
import { usePosePlayer } from '@/lib/pose-player';
import { TEST_SEQUENCE } from '@/lib/test-sequence';
import { TEST_RIGHT_ARROWS, TEST_LEFT_ARROWS, ARROW_SEQUENCE_DURATION } from '@/lib/test-arrow-sequence';
import { GameHUD } from '@/components/GameHUD';

function PosePlayer() {
  usePosePlayer(TEST_SEQUENCE);
  return null;
}

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ backgroundColor: '#462d2d' }}>
      <Scene />
      <PosePlayer />
      <GameHUD
        rightArrows={TEST_RIGHT_ARROWS}
        leftArrows={TEST_LEFT_ARROWS}
        arrowDuration={ARROW_SEQUENCE_DURATION}
      />
    </div>
  );
}

'use client';

import { Scene } from '@/components/Scene';
import { usePosePlayer } from '@/lib/pose-player';
import { TEST_SEQUENCE } from '@/lib/test-sequence';
import { GameHUD } from '@/components/GameHUD';

function PosePlayer() {
  usePosePlayer(TEST_SEQUENCE);
  return null;
}

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-900">
      <Scene />
      <PosePlayer />
      <GameHUD sequence={TEST_SEQUENCE} />
    </div>
  );
}

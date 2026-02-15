'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scene } from '@/components/Scene';
import { PoseDetector } from '@/components/PoseDetector';
import { usePosePlayer } from '@/lib/pose-player';
import { usePoseChecker } from '@/lib/use-pose-checker';
import { TEST_SEQUENCE } from '@/lib/test-sequence';
import { TEST_RIGHT_ARROWS, TEST_LEFT_ARROWS, ARROW_SEQUENCE_DURATION } from '@/lib/test-arrow-sequence';
import { GameHUD } from '@/components/GameHUD';
import { useGameStore } from '@/lib/game-store';

function PosePlayer({ paused }: { paused: boolean }) {
  usePosePlayer(TEST_SEQUENCE, paused);
  return null;
}

function PoseChecker({ paused }: { paused: boolean }) {
  usePoseChecker(TEST_SEQUENCE, paused);
  return null;
}

export default function Play() {
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(42);
  const [showEnd, setShowEnd] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [savingScore, setSavingScore] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = useGameStore((s) => s.score);
  const songId = searchParams.get('songId');
  const lyrics = [
    'Step in, breathe out, let the rhythm roll',
    'Feet on the grid, find the beat in your soul',
    'Hands in the air, draw a line through the night',
    'Hold the center, then glide to the light',
  ];
  const currentLine = 1;

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (secondsLeft === 0 && !showEnd) {
      setPaused(true);
      setShowEnd(true);
    }
  }, [secondsLeft, showEnd]);

  const timerText = `00:${String(secondsLeft).padStart(2, '0')}`;

  async function submitScore() {
    if (!songId || !playerName.trim()) return;
    setSavingScore(true);
    try {
      await fetch(`/api/songs/${songId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName.trim(), score }),
      });
    } finally {
      setSavingScore(false);
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: 'linear-gradient(to bottom, #462d2d, #0d0606)' }}>
      <button
        className="absolute top-12 left-12 z-50 flex items-center justify-center rounded-md border-2"
        style={{ borderColor: '#462c2d', backgroundColor: '#f8f4f2', width: '44px', height: '36px' }}
        onClick={() => setPaused(true)}
        type="button"
        aria-label="Pause"
      >
        <span className="flex gap-1.5">
          <span className="block rounded-sm" style={{ width: '6px', height: '18px', backgroundColor: '#462c2d' }} />
          <span className="block rounded-sm" style={{ width: '6px', height: '18px', backgroundColor: '#462c2d' }} />
        </span>
      </button>
      <Scene />
      <div
        className="absolute left-12 z-40 rounded-xl border-2 p-4"
        style={{
          bottom: '320px',
          width: '320px',
          backgroundColor: '#f8f4f2',
          borderColor: '#462c2d',
        }}
      >
        <div className="text-sm uppercase tracking-wide mb-3" style={{ color: '#462c2d' }}>
          Lyrics
        </div>
        <div className="flex flex-col gap-2">
          {lyrics.map((line, idx) => (
            <div
              key={line}
              className="text-sm leading-snug"
              style={{
                color: '#462c2d',
                opacity: idx === currentLine ? 1 : 0.5,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
      <div
        className="absolute right-12 z-40 text-2xl font-bold"
        style={{
          bottom: '506px',
          color: '#f8f4f2',
          textAlign: 'center',
        }}
      >
        {timerText}
      </div>
      <PoseDetector />
      <PosePlayer paused={paused} />
      <PoseChecker paused={paused} />
      <GameHUD
        rightArrows={TEST_RIGHT_ARROWS}
        leftArrows={TEST_LEFT_ARROWS}
        arrowDuration={ARROW_SEQUENCE_DURATION}
        paused={paused}
      />
      {paused && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(70, 44, 45, 0.5)' }}
        >
          <div className="flex flex-col items-center gap-4">
            <button
              className="px-6 py-3 rounded-md border-2 text-lg"
              style={{ borderColor: '#f8f4f2', color: '#f8f4f2', backgroundColor: 'transparent' }}
              onClick={() => setPaused(false)}
              type="button"
            >
              Play
            </button>
            <button
              className="px-6 py-2 rounded-md border-2 text-sm"
              style={{ borderColor: '#f8f4f2', color: '#f8f4f2', backgroundColor: 'transparent' }}
              type="button"
              onClick={() => router.push('/')}
            >
              Exit To Home
            </button>
          </div>
        </div>
      )}
      {showEnd && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(70, 44, 45, 0.6)' }}
        >
          <div
            className="rounded-2xl border-2 p-6 w-[320px] flex flex-col gap-4"
            style={{ borderColor: '#f8f4f2', color: '#f8f4f2' }}
          >
            <div className="text-lg font-semibold text-center">Level Complete</div>
            <div className="text-sm text-center">Score: {score}</div>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ color: '#462c2d', backgroundColor: '#f8f4f2' }}
              placeholder="Enter your name"
            />
            <button
              type="button"
              className="w-full rounded-full px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: '#f8f4f2', color: '#462c2d' }}
              onClick={submitScore}
              disabled={savingScore || !playerName.trim() || !songId}
            >
              {savingScore ? 'Saving…' : 'Save To Leaderboard'}
            </button>
            <button
              type="button"
              className="text-xs text-center underline"
              style={{ color: '#f8f4f2' }}
              onClick={() => router.push('/')}
            >
              Exit To Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

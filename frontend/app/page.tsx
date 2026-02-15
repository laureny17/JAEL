'use client';

import { useEffect, useRef, useState } from 'react';
import { Scene } from '@/components/Scene';
import { usePosePlayer } from '@/lib/pose-player';
import { TEST_SEQUENCE } from '@/lib/test-sequence';
import { TEST_RIGHT_ARROWS, TEST_LEFT_ARROWS, ARROW_SEQUENCE_DURATION } from '@/lib/test-arrow-sequence';
import { GameHUD } from '@/components/GameHUD';

function PosePlayer({ paused }: { paused: boolean }) {
  usePosePlayer(TEST_SEQUENCE, paused);
  return null;
}

function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        // Camera permissions denied or unavailable.
      }
    }

    start();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div
      className="absolute right-12 z-40 overflow-hidden"
      style={{
        bottom: '320px',
        width: '280px',
        height: '170px',
        borderRadius: '12px',
        border: '2px solid #462c2d',
        backgroundColor: '#f8f4f2',
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />
    </div>
  );
}

export default function Home() {
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(42);
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

  const timerText = `00:${String(secondsLeft).padStart(2, '0')}`;

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
      <CameraFeed />
      <PosePlayer paused={paused} />
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
            >
              Exit To Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scene } from '@/components/Scene';
import { PoseDetector } from '@/components/PoseDetector';
import { usePosePlayer } from '@/lib/pose-player';
import { usePoseChecker } from '@/lib/use-pose-checker';
import { GameHUD } from '@/components/GameHUD';
import { useGameStore } from '@/lib/game-store';
import type { ArrowSequence, GridPosition, HandCueSequence, PoseSequence } from '@/lib/types';

type PipelineResult = {
  lyrics?: {
    title?: string;
    lyrics?: string;
  };
  track?: {
    audioUrl?: string;
    audio_url?: string;
  };
  poses?: PoseSequence;
  poseSequence?: PoseSequence;
};

type SongDetailResponse = {
  song?: PipelineResult & {
    id: string;
    prompt?: string;
    title?: string;
    lengthSeconds?: number;
  };
};

function PosePlayer({ sequence, paused }: { sequence: PoseSequence; paused: boolean }) {
  usePosePlayer(sequence, paused);
  return null;
}

function PoseChecker({ sequence, paused }: { sequence: PoseSequence; paused: boolean }) {
  usePoseChecker(sequence, paused);
  return null;
}

function buildFootArrows(sequence: PoseSequence, foot: 'leftFoot' | 'rightFoot'): ArrowSequence {
  if (sequence.length === 0) return [];

  const arrows: ArrowSequence = [];
  let previous: GridPosition = 'M';

  for (const keyframe of sequence) {
    const direction = keyframe.pose[foot];
    if (direction !== previous && direction !== 'M') {
      arrows.push({ time: keyframe.time, direction });
    }
    previous = direction;
  }

  return arrows;
}

function normalizePoseSequence(sequence: PoseSequence): PoseSequence {
  return [...sequence]
    .filter((keyframe) => Number.isFinite(keyframe.time) && keyframe.time >= 0)
    .sort((a, b) => a.time - b.time);
}

function buildHandCues(sequence: PoseSequence): HandCueSequence {
  if (sequence.length === 0) return [];

  // Keep every timed instruction so this lane mirrors the exact hand sequence
  // driving the model, without dropping repeated or rapid changes.
  return sequence.map((keyframe) => ({
    time: keyframe.time,
    label: `L: ${keyframe.pose.leftHandShape} | R: ${keyframe.pose.rightHandShape}`,
  }));
}

function toLyricLines(rawLyrics?: string): string[] {
  if (!rawLyrics) return [];

  return rawLyrics
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^\[.*\]$/.test(line));
}

export default function Play() {
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [savingScore, setSavingScore] = useState(false);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [sequence, setSequence] = useState<PoseSequence>([]);
  const [rightArrows, setRightArrows] = useState<ArrowSequence>([]);
  const [leftArrows, setLeftArrows] = useState<ArrowSequence>([]);
  const [handCues, setHandCues] = useState<HandCueSequence>([]);
  const [arrowDuration, setArrowDuration] = useState(1);
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [songAudioUrl, setSongAudioUrl] = useState<string | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const lyricLineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = useGameStore((s) => s.score);
  const currentTime = useGameStore((s) => s.currentTime);
  const songId = searchParams.get('songId');

  const currentLine = useMemo(() => {
    if (lyrics.length === 0) return 0;
    if (arrowDuration <= 0) return 0;
    const progress = Math.min(0.999, Math.max(0, currentTime / arrowDuration));
    return Math.min(lyrics.length - 1, Math.floor(progress * lyrics.length));
  }, [lyrics, currentTime, arrowDuration]);

  const setLyricLineRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      lyricLineRefs.current[idx] = el;
    },
    []
  );

  useEffect(() => {
    const container = lyricsContainerRef.current;
    const activeLine = lyricLineRefs.current[currentLine];
    if (!container || !activeLine) return;

    const top = activeLine.offsetTop - container.offsetTop;
    container.scrollTo({ top, behavior: 'smooth' });
  }, [currentLine]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const shouldPlay = Boolean(songAudioUrl) && !paused && !loadingPipeline && !showEnd && !pipelineError;
    if (!shouldPlay) {
      audio.pause();
      return;
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay policy errors; user can still interact and continue.
      });
    }
  }, [songAudioUrl, paused, loadingPipeline, showEnd, pipelineError]);

  useEffect(() => {
    let cancelled = false;

    async function loadPipelineData() {
      if (!songId) {
        if (!cancelled) {
          setLoadingPipeline(false);
          setPipelineError('Missing song id.');
        }
        return;
      }

      setLoadingPipeline(true);
      setPipelineError(null);

      try {
        const songResponse = await fetch(`/api/songs/${songId}`, { cache: 'no-store' });
        if (!songResponse.ok) {
          const errorText = await songResponse.text();
          let backendMessage = '';
          try {
            const parsed = JSON.parse(errorText) as { error?: string };
            backendMessage = typeof parsed.error === 'string' ? parsed.error : '';
          } catch {
            backendMessage = errorText;
          }
          throw new Error(backendMessage || `Could not load song (${songResponse.status}).`);
        }

        const songJson = (await songResponse.json()) as SongDetailResponse;
        const data: PipelineResult = songJson?.song ?? {};
        const nextAudioUrl = data.track?.audioUrl || data.track?.audio_url || null;

        const rawSequence = Array.isArray(data.poses)
          ? data.poses
          : Array.isArray(data.poseSequence)
            ? data.poseSequence
            : [];
        const nextSequence = normalizePoseSequence(rawSequence);

        if (nextSequence.length === 0) {
          throw new Error('This song has no saved choreography yet.');
        }

        const nextRightArrows = buildFootArrows(nextSequence, 'rightFoot');
        const nextLeftArrows = buildFootArrows(nextSequence, 'leftFoot');
        const nextHandCues = buildHandCues(nextSequence);
        const nextDuration = Math.max(1, Math.ceil(nextSequence[nextSequence.length - 1]?.time ?? 1));

        const lyricLines = toLyricLines(data.lyrics?.lyrics);

        if (!cancelled) {
          useGameStore.getState().resetScore();
          useGameStore.getState().setCurrentTime(0);
          setSequence(nextSequence);
          setRightArrows(nextRightArrows);
          setLeftArrows(nextLeftArrows);
          setHandCues(nextHandCues);
          setArrowDuration(nextDuration);
          setSecondsLeft(nextDuration);
          setShowEnd(false);
          setPaused(false);
          setSongAudioUrl(nextAudioUrl);
          setLyrics(lyricLines);
        }
      } catch (error) {
        if (!cancelled) {
          setPipelineError(error instanceof Error ? error.message : 'Failed to load choreography.');
          setSongAudioUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingPipeline(false);
        }
      }
    }

    void loadPipelineData();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  useEffect(() => {
    if (paused || loadingPipeline || sequence.length === 0) return;

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [paused, loadingPipeline, sequence]);

  useEffect(() => {
    if (secondsLeft === 0 && !showEnd && !loadingPipeline && sequence.length > 0) {
      setPaused(true);
      setShowEnd(true);
    }
  }, [secondsLeft, showEnd, loadingPipeline, sequence]);

  const timerText = `00:${String(secondsLeft).padStart(2, '0')}`;

  async function submitScore() {
    if (!songId || !playerName.trim()) return;
    setSavingScore(true);
    try {
      const response = await fetch(`/api/songs/${songId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName.trim(), score }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save score (${response.status})`);
      }
      router.push('/');
    } finally {
      setSavingScore(false);
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: 'linear-gradient(to bottom, #462d2d, #0d0606)' }}>
      <audio ref={audioRef} src={songAudioUrl ?? undefined} preload="auto" />
      <button
        className="absolute top-12 left-12 z-50 flex items-center justify-center rounded-md border-2"
        style={{ borderColor: '#462c2d', backgroundColor: '#f8f4f2', width: '44px', height: '36px' }}
        onClick={() => setPaused(true)}
        type="button"
        aria-label="Pause"
        disabled={loadingPipeline || sequence.length === 0}
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
          height: '180px',
          backgroundColor: '#f8f4f2',
          borderColor: '#462c2d',
        }}
      >
        <div className="text-sm uppercase tracking-wide mb-3" style={{ color: '#462c2d' }}>
          Lyrics
        </div>
        <div ref={lyricsContainerRef} className="flex flex-col gap-2 overflow-y-auto h-[126px] pr-1">
          {lyrics.map((line, idx) => (
            <div
              key={`${line}-${idx}`}
              ref={setLyricLineRef(idx)}
              className="text-sm leading-snug"
              style={{
                color: '#462c2d',
                opacity: idx === currentLine ? 1 : 0.5,
              }}
            >
              {line}
            </div>
          ))}
          {lyrics.length === 0 && (
            <div className="text-sm leading-snug" style={{ color: '#462c2d', opacity: 0.6 }}>
              No lyrics available.
            </div>
          )}
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
      <PosePlayer sequence={sequence} paused={paused || loadingPipeline || showEnd} />
      <PoseChecker sequence={sequence} paused={paused || loadingPipeline || showEnd} />
      <GameHUD
        rightArrows={rightArrows}
        leftArrows={leftArrows}
        handCues={handCues}
        arrowDuration={arrowDuration}
        paused={paused || loadingPipeline || showEnd}
      />

      {loadingPipeline && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(70, 44, 45, 0.6)' }}
        >
          <div className="text-sm" style={{ color: '#f8f4f2' }}>
            Loading saved level...
          </div>
        </div>
      )}

      {!loadingPipeline && pipelineError && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(70, 44, 45, 0.6)' }}
        >
          <div className="rounded-2xl border-2 p-6 w-[360px] flex flex-col gap-4" style={{ borderColor: '#f8f4f2', color: '#f8f4f2' }}>
            <div className="text-lg font-semibold text-center">Could not load level</div>
            <div className="text-sm text-center">{pipelineError}</div>
            <button
              type="button"
              className="w-full rounded-full px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: '#f8f4f2', color: '#462c2d' }}
              onClick={() => router.push('/')}
            >
              Exit To Home
            </button>
          </div>
        </div>
      )}

      {paused && !showEnd && !loadingPipeline && !pipelineError && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(70, 44, 45, 0.5)' }}
        >
          <div
            className="rounded-2xl border-2 p-6 w-[300px] flex flex-col items-center gap-4"
            style={{ borderColor: '#f8f4f2', backgroundColor: '#462c2d' }}
          >
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
            style={{ borderColor: '#f8f4f2', color: '#f8f4f2', backgroundColor: '#462c2d' }}
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

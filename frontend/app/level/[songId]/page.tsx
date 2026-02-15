'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type SongDetail = {
  id: string;
  title?: string;
  prompt?: string;
  audienceDescriptor?: string;
  lengthSeconds?: number;
  lyrics?: {
    title?: string;
    lyrics?: string;
  };
};

type ScoreEntry = {
  id: string;
  name: string;
  score: number;
  createdAt?: string;
};

function formatDuration(seconds?: number): string {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function LevelDetailPage() {
  const params = useParams<{ songId: string }>();
  const songId = params?.songId;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!songId) {
        setLoading(false);
        setError('Missing song id.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [songRes, leaderboardRes] = await Promise.all([
          fetch(`/api/songs/${songId}`, { cache: 'no-store' }),
          fetch(`/api/songs/${songId}/leaderboard?limit=20`, { cache: 'no-store' }),
        ]);

        if (!songRes.ok) {
          throw new Error(`Could not load level (${songRes.status}).`);
        }
        if (!leaderboardRes.ok) {
          throw new Error(`Could not load leaderboard (${leaderboardRes.status}).`);
        }

        const songJson = await songRes.json();
        const leaderboardJson = await leaderboardRes.json();

        if (!cancelled) {
          setSong(songJson?.song ?? null);
          setScores(Array.isArray(leaderboardJson?.scores) ? leaderboardJson.scores : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load level details.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const title = useMemo(() => (song?.title || 'untitled').toLowerCase(), [song?.title]);

  return (
    <div className="min-h-screen w-screen overflow-x-hidden overflow-y-auto px-10 md:px-16 lg:px-28 py-12 lowercase" style={{ background: '#5a3a3b' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <Link href="/" className="px-4 py-2 rounded-full border-2 text-xs" style={{ borderColor: '#f8f4f2', color: '#f8f4f2' }}>
            back to home
          </Link>
          {songId && (
            <Link href={`/play?songId=${songId}`} className="px-5 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: '#f8f4f2', color: '#462c2d' }}>
              play this level
            </Link>
          )}
        </div>

        {loading && (
          <div className="text-sm" style={{ color: '#f8f4f2', opacity: 0.9 }}>loading level details…</div>
        )}

        {!loading && error && (
          <div className="text-sm" style={{ color: '#f8f4f2' }}>{error}</div>
        )}

        {!loading && !error && song && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 rounded-2xl border-2 p-6" style={{ borderColor: '#462c2d', backgroundColor: '#f8f4f2' }}>
              <div className="text-xl font-semibold" style={{ color: '#462c2d' }}>{title}</div>
              <div className="text-xs mt-2" style={{ color: '#462c2d', opacity: 0.7 }}>
                length: {formatDuration(song.lengthSeconds)}
              </div>

              <div className="mt-6 text-sm font-semibold" style={{ color: '#462c2d' }}>
                prompt
              </div>
              <div className="mt-2 text-sm leading-relaxed" style={{ color: '#462c2d' }}>
                {song.prompt || 'No prompt saved for this level.'}
              </div>

              <div className="mt-6 text-sm font-semibold" style={{ color: '#462c2d' }}>
                audience notes
              </div>
              <div className="mt-2 text-sm leading-relaxed" style={{ color: '#462c2d' }}>
                {song.audienceDescriptor?.trim() || 'No audience notes were provided.'}
              </div>

              <div className="mt-6 text-sm font-semibold" style={{ color: '#462c2d' }}>
                lyrics
              </div>
              <div
                className="mt-2 text-sm leading-relaxed whitespace-pre-wrap rounded-lg border p-3 max-h-80 overflow-y-auto"
                style={{ color: '#462c2d', borderColor: '#462c2d22', backgroundColor: '#fff' }}
              >
                {song.lyrics?.lyrics?.trim() || 'No lyrics were saved for this level.'}
              </div>
            </div>

            <div className="rounded-2xl border-2 p-6" style={{ borderColor: '#462c2d', backgroundColor: '#f8f4f2' }}>
              <div className="text-sm font-semibold mb-4" style={{ color: '#462c2d' }}>
                leaderboard
              </div>

              {scores.length === 0 ? (
                <div className="text-xs" style={{ color: '#462c2d', opacity: 0.7 }}>
                  no scores yet. be the first to submit.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {scores.map((entry, idx) => (
                    <div key={entry.id} className="rounded-lg px-3 py-2 border" style={{ borderColor: '#462c2d22', backgroundColor: '#fff' }}>
                      <div className="text-xs font-semibold" style={{ color: '#462c2d' }}>
                        {idx + 1}. {entry.name}
                      </div>
                      <div className="text-xs" style={{ color: '#462c2d', opacity: 0.75 }}>
                        score: {entry.score}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

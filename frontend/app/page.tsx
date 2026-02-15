'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const MAX_PROMPT = 160;
const LENGTH_OPTIONS = [
  { id: 'short', label: 'Short', seconds: 60 },
  { id: 'medium', label: 'Medium', seconds: 90 },
  { id: 'long', label: 'Long', seconds: 120 },
];

const COMMUNITY_SONGS = [
  { id: '64f000000000000000000001', title: 'Aether Pulse', creator: 'Nova', length: '1:00' },
  { id: '64f000000000000000000002', title: 'Sparrow Dance', creator: 'Lio', length: '1:30' },
  { id: '64f000000000000000000003', title: 'Citrine Sky', creator: 'Aya', length: '2:00' },
];

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [lengthId, setLengthId] = useState('short');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'create' | 'play' | null>(null);

  const length = LENGTH_OPTIONS.find((opt) => opt.id === lengthId) ?? LENGTH_OPTIONS[0];

  const sunoPrompt = useMemo(() => {
    const base = prompt.trim() || 'A rhythmic dance track with punchy, repeatable hooks.';
    if (!audience.trim()) return base;
    return `${base}\n\nAudience descriptor (written as an audience descriptor): ${audience.trim()}`;
  }, [prompt, audience]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          audienceDescriptor: audience.trim(),
          lengthSeconds: length.seconds,
          title: 'Untitled',
        }),
      });
      const data = await response.json();
      if (response.ok && data.id) {
        window.location.href = `/play?songId=${data.id}`;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-screen overflow-hidden lowercase" style={{ background: '#5a3a3b' }}>
      <div className="px-6 pt-24 pb-10 flex flex-col items-center text-center">
        <div className="text-5xl md:text-6xl font-bold mb-4 lowercase" style={{ color: '#f8f4f2' }}>
          step step learn
        </div>
        <div className="max-w-2xl text-base md:text-lg mb-6 lowercase" style={{ color: '#f8f4f2', opacity: 0.8 }}>
          generate dance levels from your ideas and learn through movement — then play and compare scores with everyone.
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="px-5 py-2 rounded-full border-2 text-sm lowercase"
            style={{
              borderColor: '#462c2d',
              backgroundColor: mode === 'create' ? '#462c2d' : '#f8f4f2',
              color: mode === 'create' ? '#f8f4f2' : '#462c2d',
            }}
            onClick={() => setMode('create')}
          >
            create new level
          </button>
          <button
            type="button"
            className="px-5 py-2 rounded-full border-2 text-sm lowercase"
            style={{
              borderColor: '#462c2d',
              backgroundColor: mode === 'play' ? '#462c2d' : '#f8f4f2',
              color: mode === 'play' ? '#f8f4f2' : '#462c2d',
            }}
            onClick={() => setMode('play')}
          >
            play existing levels
          </button>
        </div>
      </div>

      {mode === 'create' ? (
        <div className="px-6 pb-14 flex justify-center">
          <div className="w-full max-w-3xl rounded-3xl border-2 p-6" style={{ backgroundColor: '#f8f4f2', borderColor: '#f8f4f2' }}>
            <div className="text-sm mb-4 lowercase" style={{ color: '#462c2d' }}>
              new to step step learn?{' '}
              <Link href="/play" className="underline">
                try a short example here
              </Link>
            </div>
            <div className="text-lg font-semibold mb-6 lowercase" style={{ color: '#f8f4f2' }}>
              generate a level
            </div>

            <label className="block text-sm mb-2 lowercase" style={{ color: '#462c2d' }}>
              prompt
            </label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, MAX_PROMPT))}
              className="w-full rounded-xl border-2 p-4 text-sm resize-none lowercase"
              style={{ borderColor: '#462c2d', color: '#462c2d', backgroundColor: '#f8f4f2' }}
              rows={2}
              placeholder="describe the topic you would like to learn about."
            />

            <div className="mt-6">
              <label className="block text-sm mb-2 lowercase" style={{ color: '#462c2d' }}>
                song length
              </label>
              <div className="flex flex-wrap gap-3">
                {LENGTH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="px-4 py-2 rounded-full border-2 text-sm lowercase"
                    style={{
                      borderColor: '#462c2d',
                      backgroundColor: lengthId === option.id ? '#462c2d' : '#f8f4f2',
                      color: lengthId === option.id ? '#f8f4f2' : '#462c2d',
                    }}
                    onClick={() => setLengthId(option.id)}
                  >
                    {option.label.toLowerCase()} · {option.seconds}s
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm mb-2 lowercase" style={{ color: '#462c2d' }}>
                audience descriptor (optional)
              </label>
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                className="w-full rounded-xl border-2 px-4 py-3 text-sm lowercase"
                style={{ borderColor: '#462c2d', color: '#462c2d', backgroundColor: '#f8f4f2' }}
                placeholder="e.g., for second-graders learning about the water cycle"
              />
            </div>

            <button
              type="button"
              className="mt-6 px-6 py-3 rounded-full text-sm font-semibold disabled:opacity-50 lowercase"
              style={{ backgroundColor: '#462c2d', color: '#f8f4f2' }}
              onClick={handleGenerate}
              disabled={isSubmitting || !prompt.trim()}
            >
              {isSubmitting ? 'generating…' : 'generate song + level'}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-20">
          <div className="text-lg font-semibold mb-6 lowercase" style={{ color: '#f8f4f2' }}>
            community creations
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COMMUNITY_SONGS.map((song) => (
              <div key={song.id} className="rounded-2xl border-2 p-5" style={{ borderColor: '#462c2d', backgroundColor: '#f8f4f2' }}>
                <div className="text-base font-semibold lowercase" style={{ color: '#462c2d' }}>
                  {song.title.toLowerCase()}
                </div>
                <div className="text-xs mt-2 lowercase" style={{ color: '#462c2d', opacity: 0.7 }}>
                  by {song.creator.toLowerCase()} · {song.length}
                </div>
                <Link
                  href="/play"
                  className="inline-flex mt-4 px-4 py-2 rounded-full border-2 text-xs lowercase"
                  style={{ borderColor: '#462c2d', color: '#462c2d' }}
                >
                  play this
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

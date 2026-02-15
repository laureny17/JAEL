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
    <div className="min-h-screen w-screen overflow-hidden" style={{ background: 'linear-gradient(to bottom, #f8f4f2, #e7ddd7)' }}>
      <div className="px-12 py-10 flex items-center justify-between">
        <div className="text-2xl font-bold" style={{ color: '#462c2d' }}>
          JAEL
        </div>
        <Link
          href="/play"
          className="px-5 py-2 rounded-full border-2 text-sm"
          style={{ borderColor: '#462c2d', color: '#462c2d' }}
        >
          Try Demo
        </Link>
      </div>

      <div className="px-12 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 pb-16">
        <div className="rounded-3xl border-2 p-8" style={{ backgroundColor: '#fffdfb', borderColor: '#462c2d' }}>
          <div className="text-lg font-semibold mb-6" style={{ color: '#462c2d' }}>
            Generate A Level
          </div>

          <label className="block text-sm mb-2" style={{ color: '#462c2d' }}>
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value.slice(0, MAX_PROMPT))}
            className="w-full rounded-xl border-2 p-4 text-sm resize-none"
            style={{ borderColor: '#462c2d', color: '#462c2d', backgroundColor: '#f8f4f2' }}
            rows={2}
            placeholder="Describe the topic you would like to learn about."
          />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#462c2d' }}>
                Song Length
              </label>
              <div className="flex gap-3">
                {LENGTH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="px-4 py-2 rounded-full border-2 text-sm"
                    style={{
                      borderColor: '#462c2d',
                      backgroundColor: lengthId === option.id ? '#462c2d' : '#f8f4f2',
                      color: lengthId === option.id ? '#f8f4f2' : '#462c2d',
                    }}
                    onClick={() => setLengthId(option.id)}
                  >
                    {option.label} · {option.seconds}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#462c2d' }}>
                Audience Descriptor (Optional)
              </label>
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                className="w-full rounded-xl border-2 px-4 py-3 text-sm"
                style={{ borderColor: '#462c2d', color: '#462c2d', backgroundColor: '#f8f4f2' }}
                placeholder="e.g., for second-graders learning about the water cycle"
              />
            </div>
          </div>

          <button
            type="button"
            className="mt-6 px-6 py-3 rounded-full text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#462c2d', color: '#f8f4f2' }}
            onClick={handleGenerate}
            disabled={isSubmitting || !prompt.trim()}
          >
            {isSubmitting ? 'Generating…' : 'Generate Song + Level'}
          </button>
        </div>

        <div className="rounded-3xl border-2 p-8 h-full" style={{ backgroundColor: '#fffdfb', borderColor: '#462c2d' }}>
          <div className="text-lg font-semibold mb-4" style={{ color: '#462c2d' }}>
            What Happens Next
          </div>
          <ol className="text-sm space-y-3" style={{ color: '#462c2d' }}>
            <li>1. Your prompt guides lyrics, tempo, and choreography.</li>
            <li>2. The audience descriptor tunes the mood of the track.</li>
            <li>3. The system outputs a playable level with synced steps.</li>
          </ol>
        </div>
      </div>

      <div className="px-12 pb-20">
        <div className="text-lg font-semibold mb-6" style={{ color: '#462c2d' }}>
          Community Creations
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COMMUNITY_SONGS.map((song) => (
            <div key={song.id} className="rounded-2xl border-2 p-5" style={{ borderColor: '#462c2d', backgroundColor: '#fffdfb' }}>
              <div className="text-base font-semibold" style={{ color: '#462c2d' }}>
                {song.title}
              </div>
              <div className="text-xs mt-2" style={{ color: '#462c2d', opacity: 0.7 }}>
                by {song.creator} · {song.length}
              </div>
              <Link
                href="/play"
                className="inline-flex mt-4 px-4 py-2 rounded-full border-2 text-xs"
                style={{ borderColor: '#462c2d', color: '#462c2d' }}
              >
                Play This
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

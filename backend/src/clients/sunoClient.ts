import { env } from "../config/env.js";
import type { LyricResult, SunoTrackResult } from "../types/dance.js";

type SunoCreatePayload = {
  prompt: string;
  title: string;
  tags?: string;
};

export async function createSunoTrackFromLyrics(
  lyrics: LyricResult,
  genre?: string
): Promise<SunoTrackResult> {
  const payload: SunoCreatePayload = {
    prompt: lyrics.lyrics,
    title: lyrics.title,
    tags: genre
  };

  // Replace this path/body with your exact Suno endpoint contract.
  const response = await fetch(`${env.sunoApiBaseUrl}/v1/music/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.sunoApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Suno request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as Partial<SunoTrackResult>;

  return {
    trackId: data.trackId ?? "unknown",
    status: data.status ?? "queued",
    audioUrl: data.audioUrl,
    bpm: data.bpm
  };
}

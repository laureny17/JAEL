import { env } from "../config/env.js";
import type { LyricResult, SunoTrackResult } from "../types/dance.js";

type SunoGeneratePayload = {
  prompt: string;
  tags?: string;
};

type SunoGenerateResponse = {
  id: string;
  request_id: string;
  status: string;
  title: string;
  created_at: string;
  metadata: {
    tags?: string;
    prompt?: string;
    gpt_description_prompt?: string;
    type: string;
  };
};

export async function createSunoTrackFromLyrics(
  lyrics: LyricResult,
  genre?: string
): Promise<SunoTrackResult> {
  // Step 1: Generate the track using Suno API
  const payload: SunoGeneratePayload = {
    prompt: lyrics.lyrics,
    tags: genre
  };

  console.log("Calling Suno API with payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(`${env.sunoApiBaseUrl}generate`, {
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

  const data = (await response.json()) as SunoGenerateResponse;

  console.log(`✅ Track submitted to Suno. ID: ${data.id}`);
  console.log(`Status: ${data.status}`);

  // Return initial result with the clip ID
  return {
    trackId: data.id,
    status: data.status as "submitted" | "queued" | "streaming" | "complete" | "error",
    audioUrl: undefined,
    bpm: undefined
  };
}

// Function to poll for track status and get audio URL
export async function getSunoTrackStatus(trackId: string): Promise<SunoTrackResult> {
  const url = `${env.sunoApiBaseUrl}clips?ids=${trackId}`;
  console.log(`Polling Suno API: ${url}`);
  console.log(`Track ID: ${trackId}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.sunoApiKey}`
    }
  });

  console.log(`Response status: ${response.status}`);

  if (!response.ok) {
    const body = await response.text();
    console.log(`Error response body: ${body}`);
    throw new Error(`Suno clips request failed: ${response.status} ${body}`);
  }

  const clips = (await response.json()) as Array<{
    id: string;
    status: string;
    title?: string;
    audio_url?: string;
    metadata?: {
      duration?: number;
    };
  }>;

  const clip = clips[0];
  if (!clip) {
    throw new Error(`Clip ${trackId} not found`);
  }

  return {
    trackId: clip.id,
    status: clip.status as "submitted" | "queued" | "streaming" | "complete" | "error",
    audioUrl: clip.audio_url,
    bpm: undefined // Suno API doesn't provide BPM in the response
  };
}

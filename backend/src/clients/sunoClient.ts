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

// polling for status
export async function getSunoTrackStatus(trackId: string): Promise<SunoTrackResult> {
  // 1. Ensure slash safety
  const baseUrl = env.sunoApiBaseUrl.endsWith('/') ? env.sunoApiBaseUrl : `${env.sunoApiBaseUrl}/`;
  const url = `${baseUrl}clips?ids=${trackId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.sunoApiKey}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Suno API error (${response.status}): ${body}`);
  }

  const clips = await response.json();

  // 2. Defensive check for the array
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new Error(`Suno returned an empty result for track ${trackId}`);
  }

  const clip = clips[0];

  // 3. Status mapping with fallback
  // Suno sometimes uses 'processing' or 'queued' - let's be safe
  const currentStatus = clip.status as SunoTrackResult["status"];

  return {
    trackId: clip.id,
    status: currentStatus,
    audioUrl: clip.audio_url || undefined, // API might return empty string initially
  };
}

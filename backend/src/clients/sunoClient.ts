import axios from "axios";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { env } from "../config/env.js";
import type { LyricResult, SunoTrackResult } from "../types/dance.js";

const execFileAsync = promisify(execFile);

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
  length: 60 | 90 | 120,
  genre?: string,
  audienceDescriptor?: string
): Promise<SunoTrackResult> {
  const audienceSuffix = audienceDescriptor?.trim()
    ? `\n\nAudience descriptor (written as an audience descriptor): ${audienceDescriptor.trim()}`
    : "";

  // Step 1: Generate the track using Suno API
  const payload: SunoGeneratePayload = {
    prompt: `${lyrics.lyrics}${audienceSuffix}`,
    tags: `${genre || ''}, length:${length} seconds`
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

// Download mp3 file locally
export async function downloadSunoMp3(url: string, trackId: string): Promise<string> {
  // Create temp directory in the project root
  const tempDir = path.resolve(process.cwd(), "temp");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = path.join(tempDir, `${trackId}.mp3`);
  const writer = fs.createWriteStream(filePath);

  console.log(`📥 Downloading MP3 from: ${url}`);
  console.log(`💾 Saving to: ${filePath}`);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(`✅ Downloaded: ${filePath}`);
      resolve(filePath);
    });
    writer.on('error', reject);
  });
}

/**
 * Clip an MP3 file to a maximum duration using ffmpeg.
 * Overwrites the original file with the trimmed version.
 */
export async function clipAudio(filePath: string, maxDurationSeconds: number): Promise<void> {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const clippedPath = path.join(dir, `${base}_clipped${ext}`);

  console.log(`✂️ Clipping audio to ${maxDurationSeconds}s: ${filePath}`);

  await execFileAsync("ffmpeg", [
    "-i", filePath,
    "-t", String(maxDurationSeconds),
    "-c", "copy",
    "-y",
    clippedPath,
  ]);

  // Replace original with clipped version
  fs.renameSync(clippedPath, filePath);
  console.log(`✅ Audio clipped to ${maxDurationSeconds}s`);
}

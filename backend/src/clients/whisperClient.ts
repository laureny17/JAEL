import OpenAI from "openai";
import fs from "fs";
import { env } from "../config/env.js";

export type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

// 1. Initialize once
const openai = new OpenAI({
  apiKey: env.openaiApiKey,
});

export async function getWordTimestamps(audioPath: string): Promise<WordTimestamp[]> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"] // Focus on the words!
  });

  const result = transcription as any;
  console.log("Whisper transcription result:", JSON.stringify(result, null, 2));
  const words = Array.isArray(result?.words) ? result.words : [];
  return words
    .map((entry: any) => ({
      word: String(entry?.word ?? "").trim(),
      start: Number(entry?.start ?? 0),
      end: Number(entry?.end ?? 0),
    }))
    .filter((entry: WordTimestamp) => entry.word.length > 0);
}

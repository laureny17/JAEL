import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import type { LyricResult } from "../types/dance.js";

const anthropic = new Anthropic({
  apiKey: env.anthropicApiKey,
});

/**
 * Extract JSON object from Claude's response text
 * Handles markdown code blocks and extracts the JSON
 */
function extractJsonObject(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  }

  const jsonMatch = rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("Failed to parse JSON object from Claude response");
  }

  return jsonMatch[0];
}

/**
 * Generate song lyrics using Claude
 */
export async function generateLyrics(
  topic: string,
  mood?: string,
  genre?: string
): Promise<LyricResult> {
  const prompt = `Generate song lyrics about "${topic}"${mood ? ` with a ${mood} mood` : ''}${genre ? ` in the ${genre} genre` : ''}.

Follow this structure:
- Verse 1
- Chorus
- Verse 2
- Chorus
- Bridge
- Chorus

Return ONLY a JSON object with this exact format (no markdown, no extra text):
{
  "title": "Song Title Here",
  "lyrics": "Full lyrics with section markers like [Verse 1], [Chorus], [Bridge], etc."
}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: prompt
    }]
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log("Raw Claude response:");
  console.log(responseText);
  console.log("\n");

  // Parse the JSON response
  const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("Failed to parse lyrics JSON from Claude response");
  }

  const lyrics: LyricResult = JSON.parse(jsonMatch[0]);
  return lyrics;
}

/**
 * Group lyrics into semantically meaningful fragments (~2 beats each)
 * and map them to timestamps based on word-level transcription
 */
export async function groupLyricsIntoFragments(
  wordTimestamps: Array<{ word: string; start: number; end: number }>
): Promise<Array<{ text: string; start: number }>> {

  // Format the words into a dense string to save tokens
  const wordsInput = wordTimestamps
    .map((w) => `[${w.start.toFixed(2)}]${w.word}`)
    .join(" ");

  const prompt = `You are a rhythm game level designer. I have a list of words with [timestamps].
Group them into logical phrases (approx 2-4 words each) that feel like "natural" dance steps.

Input: ${wordsInput}

Rules:
1. Every single word from the input must be included in the segments.
2. Use the exact [timestamp] provided for the FIRST word of each segment.
3. Return a JSON array of objects.

Output Format:
{
  "segments": [
    { "text": "Open up the curtain", "start": 5.64 },
    { "text": "set the scene tonight", "start": 7.96 }
  ]
}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6", // Using 3.5 Sonnet is often faster/better for JSON than Opus
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(extractJsonObject(responseText));

  return parsed.segments; // returns Array<{text: string, start: number}>
}

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
 * Extract JSON array from Claude's response text
 */
function extractJsonArray(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  }

  const jsonMatch = rawText.match(/(\[[\s\S]*\])/);
  if (!jsonMatch) {
    throw new Error("Failed to parse JSON array from Claude response");
  }

  return jsonMatch[0];
}

/**
 * Generate song lyrics using Claude
 */
export async function generateLyrics(
  topic: string,
  length: 60 | 90 | 120,
  mood?: string,
  genre?: string
): Promise<LyricResult> {
  const prompt = `Generate SHORT, punchy song lyrics about "${topic}"${mood ? ` with a ${mood} mood` : ''}${genre ? ` in the ${genre} genre` : ''}.

This is for a rhythm dance game (like Just Dance).

Keep the length within the range ${(length - 10) / 6} to ${(length - 10) / 4} lines of singable content.

Keep lines short and rhythmic — easy to move to. Favor repetition and catchy hooks over complexity.

Return ONLY a JSON object with this exact format (no markdown, no extra text):
{
  "title": "Song Title Here",
  "lyrics": "Full lyrics with section markers like [Verse 1], [Chorus], etc."
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
): Promise<Record<string, number>> {
  const prompt = `You are analyzing a song transcription with word-level timestamps. Break the lyrics into semantically meaningful fragments that are roughly 2 beats long each, and map each fragment to the timestamp of its first word.

Word Timestamps from Whisper:
${wordTimestamps.map((w, i) => `[${i}] ${w.start.toFixed(2)}s: "${w.word}"`).join('\n')}

Task:
1) Group the words into semantically meaningful lyric fragments (roughly 2 beats each)
2) Each fragment should be a complete phrase or meaningful unit
3) For each fragment, provide the timestamp of its FIRST WORD
4) Keep fragments in sequential order

Return ONLY valid JSON with this exact shape:
{
  "fragmentTimestamps": {
    "lyric fragment text": timestamp_in_seconds,
    "next fragment text": timestamp_in_seconds
  }
}

Example:
{
  "fragmentTimestamps": {
    "Open up the curtain": 5.64,
    "set the scene tonight": 7.96,
    "Exposition baby": 10.2,
    "everything feels right": 12.5
  }
}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(extractJsonObject(responseText)) as { fragmentTimestamps: Record<string, number> };

  console.log("Claude lyric fragment response:", JSON.stringify(parsed, null, 2));

  if (!parsed.fragmentTimestamps || typeof parsed.fragmentTimestamps !== 'object') {
    throw new Error("Claude fragment output is missing fragmentTimestamps object");
  }

  // Sort by timestamp value to fix out-of-order fragments from long context
  const sorted = Object.fromEntries(
    Object.entries(parsed.fragmentTimestamps)
      .sort(([, a], [, b]) => a - b)
  );

  return sorted;
}

/**
 * Manual stack-based JSON healer to fix truncated or malformed LLM responses
 */
function robustJSONHealer(raw: string): string {
  // 1. Clean up markdown noise and whitespace
  let str = raw.replace(/```json|```/g, "").trim();

  // 2. Locate the start of the JSON array
  const firstBracket = str.indexOf('[');
  if (firstBracket === -1) return "[]";
  str = str.substring(firstBracket);

  // 3. Track nested structures to find the truncation point
  const stack: string[] = [];
  let lastCompleteObjectEnd = -1;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{') stack.push('}');
    else if (char === '[') stack.push(']');
    else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
        // If we just closed an object that is part of the main array
        if (stack.length === 1 && stack[0] === ']') {
          lastCompleteObjectEnd = i;
        }
      }
    }
  }

  // 4. If the stack isn't empty, we are truncated.
  // Slice to the end of the last valid object and close the array.
  if (stack.length > 0 && lastCompleteObjectEnd !== -1) {
    return str.substring(0, lastCompleteObjectEnd + 1) + ']';
  }

  return str;
}

/**
 * Generate 3D animation poses from lyric fragments
 */
export async function generatePoses(prompt: string): Promise<Array<any>> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6", // Switched to Sonnet for better reliability/speed
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";

  let poses: any[];
  try {
    // Attempt standard parse first
    poses = JSON.parse(responseText);
  } catch (error) {
    console.warn("⚠️ Initial JSON parse failed. Attempting robust healing...");
    try {
      const healedJson = robustJSONHealer(responseText);
      poses = JSON.parse(healedJson);
      console.log("🛠️ JSON successfully healed using stack-based recovery.");
    } catch (repairError) {
      console.error("❌ Critical: Could not heal JSON output.");
      throw new Error(`Failed to parse choreography: ${repairError instanceof Error ? repairError.message : String(repairError)}`);
    }
  }

  // Final Validation: Ensure we have an array and filter out partial objects
  if (!Array.isArray(poses)) {
    throw new Error("Claude pose output is not an array");
  }

  // Filter out any "half-baked" objects that might have been at the very end of a truncation
  const validatedPoses = poses.filter(
    (p) => p && typeof p === "object" && p.time !== undefined && p.pose !== undefined
  );

  console.log(`✅ Processed ${validatedPoses.length} valid poses`);
  return validatedPoses;
}

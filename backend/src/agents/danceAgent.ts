import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { env } from "../config/env.js";
import { createSunoTrackFromLyrics } from "../clients/sunoClient.js";
import type { DanceWorkflowResult, LyricResult } from "../types/dance.js";
import { danceSystemPrompt } from "../prompts/danceSystemPrompt.js";

const anthropic = new Anthropic({
  apiKey: env.anthropicApiKey,
});

export async function startDanceProject(topic: string, mood?: string, genre?: string): Promise<DanceWorkflowResult> {
  console.log("\n🎵 Step 1: Generating lyrics with Claude...\n");

  // Step 1: Generate lyrics using Claude
  const lyricsPrompt = `Generate song lyrics about "${topic}"${mood ? ` with a ${mood} mood` : ''}${genre ? ` in the ${genre} genre` : ''}.

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

  const lyricsResponse = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: lyricsPrompt
    }]
  });

  const lyricsText = lyricsResponse.content[0].type === 'text' ? lyricsResponse.content[0].text : '';

  console.log("Raw Claude response:");
  console.log(lyricsText);
  console.log("\n");

  // Parse the JSON response - handle markdown code blocks
  let jsonText = lyricsText.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }

  // Extract JSON object
  // Use a "Greedy" regex to find the outermost curly braces
  // This ignores markdown, intro text, and outro text in one go
  const jsonMatch = lyricsText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("Failed to parse lyrics JSON from Claude response");
  }

  const lyrics: LyricResult = JSON.parse(jsonMatch[0]);

  console.log(`✅ Generated lyrics: "${lyrics.title}"\n`);
  console.log("Lyrics preview:");
  console.log(lyrics.lyrics.substring(0, 200) + "...\n");

  // Save lyrics to output directory
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const lyricsFilename = `lyrics-${timestamp}.txt`;
  const lyricsFilepath = path.join(outputDir, lyricsFilename);

  const lyricsContent = `${lyrics.title}
${'='.repeat(lyrics.title.length)}

${lyrics.lyrics}

---
Generated: ${new Date().toLocaleString()}
Topic: ${topic}
${mood ? `Mood: ${mood}\n` : ''}${genre ? `Genre: ${genre}\n` : ''}`;

  fs.writeFileSync(lyricsFilepath, lyricsContent);
  console.log(`💾 Lyrics saved to: ${lyricsFilepath}\n`);

  // Step 2: Generate music using Suno API
  console.log("🎵 Step 2: Generating music with Suno API...\n");

  const track = await createSunoTrackFromLyrics(lyrics, genre);

  console.log(`✅ Music generation ${track.status}`);
  console.log(`Track ID: ${track.trackId}`);
  console.log(`\n📀 Track Info:`);
  console.log(`Status: ${track.status}`);
  if (track.audioUrl) {
    console.log(`Audio URL: ${track.audioUrl}`);
  }
  console.log(`\nNote: Track is being generated. Use the track ID to check status later.`);
  console.log();

  // Step 3: Return the complete workflow result
  const result: DanceWorkflowResult = {
    lyrics,
    track
  };

  return result;
}

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { env } from "../config/env.js";
import { createSunoTrackFromLyrics, downloadSunoMp3, getSunoTrackStatus } from "../clients/sunoClient.js";
import type { DanceSong, LyricFragmentResult, LyricResult } from "../types/dance.js";
import { getWordTimestamps, type WordTimestamp } from "../clients/whisperClient.js";

const anthropic = new Anthropic({
  apiKey: env.anthropicApiKey,
});

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

async function groupLyricsIntoFragments(
  fullLyrics: string,
  words: WordTimestamp[],
  bpm?: number
): Promise<LyricFragmentResult> {
  const twoBeatSeconds = bpm && bpm > 0 ? (120 / bpm) : 1;
  const wordsForPrompt = words.map((word) => ({
    word: word.word,
    start: Number(word.start.toFixed(3)),
    end: Number(word.end.toFixed(3)),
  }));

  const prompt = `Group the lyrics into semantically meaningful fragments that are around 2 beats each.

Inputs:
- full_lyrics: ${JSON.stringify(fullLyrics)}
- word_timestamps: ${JSON.stringify(wordsForPrompt)}
- bpm: ${bpm ?? "unknown"}
- target_seconds_per_fragment: ${twoBeatSeconds}

Rules:
1) Keep each lyric fragment semantically coherent.
2) Try to keep each fragment close to target_seconds_per_fragment using timestamp spacing.
3) Every fragment must map to the word_timestamps in order.
4) Return matching-length arrays.
5) timestamps must be strictly increasing.

Return ONLY valid JSON with this exact shape:
{
  "timestamps": [0.0, 1.2],
  "lyricSegments": ["segment text", "next segment"]
}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(extractJsonObject(responseText)) as LyricFragmentResult;

  if (!Array.isArray(parsed.timestamps) || !Array.isArray(parsed.lyricSegments)) {
    throw new Error("Claude fragment output is missing required arrays");
  }

  if (parsed.timestamps.length !== parsed.lyricSegments.length) {
    throw new Error("Claude fragment output has mismatched timestamps and lyricSegments lengths");
  }

  return {
    timestamps: parsed.timestamps.map((value) => Number(value)),
    lyricSegments: parsed.lyricSegments.map((value) => String(value).trim()),
  };
}

export async function startDanceProject(topic: string, mood?: string, genre?: string): Promise<DanceSong> {

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

  // --- START POLLING ---
  console.log(`\n⏳ Polling for completion (this may take 1-2 minutes)...`);

  const maxAttempts = 40; // Approx 3-4 minutes max
  let attempts = 0;
  let isReady = false;
  let finalClipData: any = null;

  while (attempts < maxAttempts) {
    // Wait 5 seconds between checks to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      finalClipData = await getSunoTrackStatus(track.trackId);
      attempts++;

      // Provide visual feedback in the console
      process.stdout.write(`\r   Status: ${finalClipData.status}, Audio URL: ${finalClipData.audio_url || 'N/A'} (Attempt ${attempts})... `);

      // "streaming" means we have a URL and can play it now!
      // "complete" means the high-quality MP3 is ready.
      if (finalClipData.status === "complete") {
        isReady = true;
        break;
      }

    } catch (pollError) {
      console.error(`\n⚠️ Polling attempt ${attempts} failed:`, pollError);
      // We don't exit here, just try again in the next loop
    }
  }

  if (!isReady || !finalClipData) {
    throw new Error("\n❌ Music generation timed out.");
  }

  console.log(`\n📀 Track Info:`);
  console.log(`Status: ${finalClipData.status}`);
  const finalAudioUrl = finalClipData.audioUrl || finalClipData.audio_url;
  if (finalAudioUrl) {
    console.log(`Audio URL: ${finalAudioUrl}`);
  }
  console.log();

  // Step 3: Return the complete workflow result
  const song: DanceSong = {
    lyrics,
    track: finalClipData
  };

  // Step 3: Transcribe and analyze audio
  if (!finalAudioUrl) {
    throw new Error("No audio URL available from Suno");
  }


  // Download the audio file locally
  // const finalAudioUrl = "https://cdn1.suno.ai/03c1821e-fe29-4d4a-b923-0b83093247d4.mp3";
  // const track = {
  //   trackId: "example-track-id",
  //   status: "complete",}
  // let song: DanceSong = {
  //   track: track
  // };

  // const lyrics = ""

  const localPath = await downloadSunoMp3(finalAudioUrl, track.trackId);

  // Use Whisper to get word-level timestamps
  console.log("🤖 Step 3: Analyzing audio with Whisper...");
  const segments = await getWordTimestamps(localPath);

  if (!segments || segments.length === 0) {
    throw new Error("Whisper transcription returned no segments");
  }

  console.log(`✅ Transcription complete. Found ${segments.length} word segments.`);

  // Sample check
  if (segments.length > 0) {
    console.log(`First Word: "${segments[0].word}" at ${segments[0].start}s`);
  }

  // Step 4: Group words into semantic lyric fragments
  console.log("🧠 Step 4: Grouping words into semantic ~2-beat lyric fragments with Claude...");
  const lyricFragments = await groupLyricsIntoFragments(lyrics.lyrics, segments);
  song.lyricFragments = lyricFragments;
  console.log(`✅ Grouped lyrics into ${lyricFragments.lyricSegments.length} fragments.`);

  return song;
}

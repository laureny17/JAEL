import fs from "fs";
import path from "path";
import { createSunoTrackFromLyrics, downloadSunoMp3, getSunoTrackStatus } from "../clients/sunoClient.js";
import { generateLyrics, groupLyricsIntoFragments, mapFragmentsToTimestamps } from "../clients/claudeClient.js";
import { getWordTimestamps } from "../clients/whisperClient.js";
import type { DanceSong } from "../types/dance.js";

export async function startDanceProject(topic: string, mood?: string, genre?: string): Promise<DanceSong> {

  console.log("\n🎵 Step 1: Generating lyrics with Claude...\n");

  // Step 1: Generate lyrics using Claude
  const lyrics = await generateLyrics(topic, mood, genre);

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

  const maxAttempts = 50; // Approx 3-4 minutes max
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

  const localPath = await downloadSunoMp3(finalAudioUrl, track.trackId);

  // Use Whisper to get word-level timestamps
  console.log("🤖 Step 3: Analyzing audio with Whisper...");
  const words = await getWordTimestamps(localPath);

  if (!words || words.length === 0) {
    throw new Error("Whisper transcription returned no segments");
  }

  console.log(`✅ Transcription complete. Found ${words.length} word segments.`);

  // Sample check
  if (words.length > 0) {
    console.log(`First Word: "${words[0].word}" at ${words[0].start}s`);
  }

  // Step 4: Group words into semantic lyric fragments with timestamps
  console.log("🧠 Step 4: Grouping words into semantic ~2-beat lyric fragments with Claude...");
  const fragmentTimestamps = await groupLyricsIntoFragments(words);
  const fragmentCount = Object.keys(fragmentTimestamps).length;
  console.log(`✅ Grouped lyrics into ${fragmentCount} fragments with timestamps.`);
  console.log("Sample fragments:", Object.entries(fragmentTimestamps));

  return song;
}

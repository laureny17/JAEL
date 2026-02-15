import fs from "fs";
import path from "path";
import { createSunoTrackFromLyrics, clipAudio, downloadSunoMp3, getSunoTrackStatus } from "../clients/sunoClient.js";
import { generateLyrics, groupLyricsIntoFragments, generatePoses } from "../clients/claudeClient.js";
import { getWordTimestamps } from "../clients/whisperClient.js";
import { poseGenerationPrompt } from "../prompts/poseGenerationPrompt.js";
import type { DanceSong } from "../types/dance.js";

export async function startDanceProject(topic: string, mood?: string, genre?: string, maxDurationSeconds: number = 60): Promise<DanceSong> {

  console.log("\n🎵 Step 1: Generating lyrics with Claude...\n");

  // Step 1: Generate lyrics using Claude
  const lyrics = await generateLyrics(topic, mood, genre);

  console.log(`✅ Generated lyrics: "${lyrics.title}"\n`);
  console.log("Lyrics preview:");
  console.log(lyrics.lyrics.substring(0, 200) + "...\n");

  // Create a unique run directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(process.cwd(), 'output', `run-${timestamp}`);
  fs.mkdirSync(runDir, { recursive: true });
  console.log(`📁 Run directory created: ${runDir}\n`);

  // Save lyrics
  const lyricsFilepath = path.join(runDir, 'lyrics.txt');
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

  // Clip audio to max duration
  await clipAudio(localPath, maxDurationSeconds);

  // Use Whisper to get word-level timestamps
  console.log("🤖 Step 3: Analyzing audio with Whisper...");
  const allWords = await getWordTimestamps(localPath);

  if (!allWords || allWords.length === 0) {
    throw new Error("Whisper transcription returned no segments");
  }

  // Filter words to only those within the duration cap
  const words = allWords.filter(w => w.start < maxDurationSeconds);
  console.log(`✅ Transcription complete. Found ${allWords.length} word segments, ${words.length} within ${maxDurationSeconds}s cap.`);

  // Sample check
  if (words.length > 0) {
    console.log(`First Word: "${words[0].word}" at ${words[0].start}s`);
  }

  // Step 4: Group words into semantic lyric fragments with timestamps
  console.log("🧠 Step 4: Grouping words into semantic ~2-beat lyric fragments with Claude...");
  const fragmentTimestamps = await groupLyricsIntoFragments(words);
  const fragmentCount = Object.keys(fragmentTimestamps).length;
  console.log(`✅ Grouped lyrics into ${fragmentCount} fragments with timestamps.`);
  console.log("Sample fragments:", Object.entries(fragmentTimestamps).slice(0, 3));

  // Step 5: Generate 3D animation poses
  console.log("\n💃 Step 5: Generating 3D animation poses with Claude...");
  const prompt = poseGenerationPrompt(fragmentTimestamps);
  const poses = await generatePoses(prompt);
  console.log(`✅ Generated ${poses.length} poses`);
  console.log("Sample pose:", poses[0]);

  // Step 6: Save all artifacts to run directory
  console.log("\n💾 Step 6: Saving all artifacts...");

  // Copy audio file to run directory
  const audioDestPath = path.join(runDir, 'audio.mp3');
  fs.copyFileSync(localPath, audioDestPath);
  console.log(`✅ Audio saved: ${audioDestPath}`);

  // Save word timestamps
  const wordsPath = path.join(runDir, 'words.json');
  fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));
  console.log(`✅ Words saved: ${wordsPath}`);

  // Save fragment timestamps
  const fragmentsPath = path.join(runDir, 'fragments.json');
  fs.writeFileSync(fragmentsPath, JSON.stringify(fragmentTimestamps, null, 2));
  console.log(`✅ Fragments saved: ${fragmentsPath}`);

  // Save poses
  const posesPath = path.join(runDir, 'poses.json');
  fs.writeFileSync(posesPath, JSON.stringify(poses, null, 2));
  console.log(`✅ Poses saved: ${posesPath}`);

  // Save complete song data
  const songPath = path.join(runDir, 'song.json');
  fs.writeFileSync(songPath, JSON.stringify(song, null, 2));
  console.log(`✅ Song data saved: ${songPath}`);

  // Save summary
  const summaryPath = path.join(runDir, 'summary.txt');
  const summary = `Dance Project Summary
${'='.repeat(50)}

Title: ${lyrics.title}
Topic: ${topic}
${mood ? `Mood: ${mood}\n` : ''}${genre ? `Genre: ${genre}\n` : ''}
Generated: ${new Date().toLocaleString()}

Track ID: ${track.trackId}
Audio URL: ${finalAudioUrl}

Statistics:
- Word segments: ${words.length}
- Lyric fragments: ${fragmentCount}
- Animation poses: ${poses.length}

Files:
- lyrics.txt
- audio.mp3
- words.json
- fragments.json
- poses.json
- song.json
`;
  fs.writeFileSync(summaryPath, summary);
  console.log(`✅ Summary saved: ${summaryPath}`);

  console.log(`\n✨ All artifacts saved to: ${runDir}\n`);

  return song;
}

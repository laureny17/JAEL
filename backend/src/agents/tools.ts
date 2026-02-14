import { createSunoTrackFromLyrics } from "../clients/sunoClient.js";
import type { LyricResult, SunoTrackResult } from "../types/dance.js";

export const danceTools = {
  generate_lyrics: async ({ topic, mood, genre }: { topic: string, mood?: string, genre?: string }) => {
    // This tool generates lyrics based on the topic
    // Claude will use its own knowledge to create lyrics
    return {
      title: `Song about ${topic}`,
      lyrics: `[Verse 1]\n...\n[Chorus]\n...\n[Verse 2]\n...`
    };
  },

  generate_music: async ({ lyrics, genre }: { lyrics: LyricResult, genre?: string }) => {
    // Call Suno API to generate music from lyrics
    const track = await createSunoTrackFromLyrics(lyrics, genre);
    return track;
  },

  save_step_chart: async (chart: any) => {
    // This is where Claude sends the final 3x3 grid data
    console.log("Final Dance Chart Received:", chart);
    return "Chart saved successfully!";
  }
};

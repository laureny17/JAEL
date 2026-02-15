import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createSunoTrackFromLyrics } from "../clients/sunoClient.js";

// Define the generate_lyrics tool
export const generateLyricsTool = tool(
  "generate_lyrics",
  "Generate song lyrics based on a topic, mood, and genre. Returns a title and lyrics with structure: Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus.",
  {
    topic: z.string().describe("The main topic or theme for the song"),
    mood: z.string().optional().describe("The mood or feeling of the song (e.g., upbeat, calm, energetic)"),
    genre: z.string().optional().describe("The musical genre (e.g., pop, rock, electronic)")
  },
  async (args) => {
    // This is a placeholder - Claude will generate the actual lyrics
    // The tool just returns a structured response
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          title: `Song about ${args.topic}`,
          lyrics: `[Verse 1]\n...\n\n[Chorus]\n...\n\n[Verse 2]\n...\n\n[Chorus]\n...\n\n[Bridge]\n...\n\n[Chorus]\n...`
        })
      }]
    };
  }
);

// Define the generate_music tool
export const generateMusicTool = tool(
  "generate_music",
  "Generate music from lyrics using the Suno API. Takes lyrics and optional genre, returns track information.",
  {
    lyrics: z.object({
      title: z.string(),
      lyrics: z.string()
    }).describe("The lyrics object with title and lyrics text"),
    genre: z.string().optional().describe("Optional genre for the music generation")
  },
  async (args) => {
    try {
      const track = await createSunoTrackFromLyrics(args.lyrics, 60, args.genre);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(track)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Error generating music: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Define the save_step_chart tool
export const saveStepChartTool = tool(
  "save_step_chart",
  "Save the final dance step chart. This is a placeholder for future implementation.",
  {
    chart: z.any().describe("The dance step chart data")
  },
  async (args) => {
    console.log("Final Dance Chart Received:", args.chart);
    return {
      content: [{
        type: "text" as const,
        text: "Chart saved successfully!"
      }]
    };
  }
);

// Export all tools as an array
export const danceTools = [
  generateLyricsTool,
  generateMusicTool,
  saveStepChartTool
];

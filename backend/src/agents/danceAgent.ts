import { query } from "@anthropic-ai/claude-agent-sdk";
import { danceTools } from "./tools.js";
import type { DanceWorkflowResult } from "../types/dance.js";

export async function startDanceProject(topic: string, mood?: string, genre?: string): Promise<DanceWorkflowResult> {
  const userPrompt = `Create a dance project about "${topic}"${mood ? ` with a ${mood} mood` : ''}${genre ? ` in the ${genre} genre` : ''}.

Follow these steps:
1. First, use the generate_lyrics tool to create song lyrics about the topic.
2. Then, use the generate_music tool to create music from those lyrics using the Suno API.
3. Finally, save the step chart (this will be implemented later).

Return the complete workflow result including lyrics and track information.`;

  const systemPrompt = `You are a dance-tech orchestrator that helps create dance projects.
You have access to tools to generate lyrics and music.
Always follow the workflow steps in order:
1. Generate lyrics using generate_lyrics tool
2. Generate music using generate_music tool with the lyrics from step 1
3. Save the step chart (placeholder for now)

Be creative with the lyrics and make sure they match the requested topic, mood, and genre.`;

  const result = query({
    prompt: userPrompt,
    options: {
      model: "claude-3-5-sonnet-latest",
      allowedTools: Object.keys(danceTools),
      systemPrompt,
    }
  });

  let finalResult: any = null;

  // Stream through the agent's responses
  for await (const msg of result) {
    console.log("Agent message:", msg.type);

    if (msg.type === 'result') {
      finalResult = msg.result;
    }
  }

  return finalResult;
}

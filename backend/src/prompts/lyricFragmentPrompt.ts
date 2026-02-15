import type { WordTimestamp } from "../clients/whisperClient.js";

export const lyricFragmentPrompt = (
  lyrics: string,
  segments: WordTimestamp[]
) => {
  return `You are a music choreographer analyzing song lyrics and their timing.

# Task
Group the transcribed lyrics into semantically meaningful fragments that are roughly 2 beats long each.

# Input Data

## Full Lyrics:
${lyrics}

## Transcribed Segments with Timestamps:
${segments.map((seg, i) => `[${i}] ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s: "${seg.word}"`).join('\n')}

# Requirements

1. **Semantic Meaning**: Each fragment should be a complete phrase or meaningful unit
2. **Duration**: Target roughly 2 beats per fragment (estimate based on natural phrasing)
3. **Non-overlapping**: Fragments should not overlap in time
4. **Coverage**: Cover the entire song, especially the chorus sections
5. **Alignment**: Use the transcribed segment timestamps as reference points
6. **Spacing**: Aim for consistent spacing between fragments (roughly every 2 beats)

# Output Format

Return ONLY a JSON object with this structure:

\`\`\`json
{
  "timestamps": [0.0, 2.4, 4.8, 7.2],
  "fragments": [
    "Opening lyric phrase",
    "Next meaningful phrase",
    "Another phrase here",
    "Final phrase"
  ]
}
\`\`\`

## Rules:
- \`timestamps\` array contains the start time (in seconds) for each fragment
- \`fragments\` array contains the corresponding lyric text
- Both arrays must have the same length
- Timestamps must be in ascending order
- Each fragment should be a complete, meaningful phrase
- Focus on chorus sections and key lyrical moments
- Estimate 2-beat spacing based on the natural rhythm of the lyrics

Return ONLY the JSON object. No markdown, no explanations.`;
};

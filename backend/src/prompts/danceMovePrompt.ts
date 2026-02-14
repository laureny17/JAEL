export const danceMovePrompt = (topic: string, chorus: string, timestamps: number[], lyricFragments: string[]) => `
You are an educational dance choreographer. Generate a complete dance move JSON for teaching "${topic}" through movement.

# Educational Dance JSON Format

## Your Task
Create dance poses for each timestamp in the chorus. Each pose should:
- Teach the concept through meaningful gestures
- Use feet directions on a 3x3 pressure board
- Define arm joint positions (2D plane, normalized coordinates)
- Specify hand shapes from the catalog
- Include safety validation

## Input Data
- Topic: ${topic}
- Chorus: ${chorus}
- Timestamps: ${JSON.stringify(timestamps)}
- Lyric Fragments: ${JSON.stringify(lyricFragments)}

## Required JSON Structure

\`\`\`json
{
  "spec_version": "1.0",
  "topic": "${topic}",
  "chorus": "${chorus}",
  "timestamps_sec": ${JSON.stringify(timestamps)},
  "timestamp_map": [
    ${timestamps.map((t, i) => `{ "t_sec": ${t}, "lyric_fragment": "${lyricFragments[i]}" }`).join(',\n    ')}
  ],
  "arm_range_calibration": {
    "left_arm": {
      "center": { "x": 0.0, "y": 0.0 },
      "left": { "x": -1.0, "y": 0.0 },
      "right": { "x": 1.0, "y": 0.0 }
    },
    "right_arm": {
      "center": { "x": 0.0, "y": 0.0 },
      "left": { "x": -1.0, "y": 0.0 },
      "right": { "x": 1.0, "y": 0.0 }
    }
  },
  "normalization_rules": {
    "radial_clamp_max": 1.0,
    "radial_clamp_formula": "if r = sqrt(x^2 + y^2) > 1 then x = x/r, y = y/r"
  },
  "hand_shape_catalog": [
    {
      "id": "OPEN_SPREAD",
      "thumb": "extended_out",
      "index": "extended",
      "middle": "extended",
      "ring": "extended",
      "pinky": "extended",
      "finger_spread": "wide"
    },
    {
      "id": "OPEN_FLAT",
      "thumb": "extended_out",
      "index": "extended",
      "middle": "extended",
      "ring": "extended",
      "pinky": "extended",
      "finger_spread": "tight"
    },
    {
      "id": "FIST",
      "thumb": "wrapped",
      "index": "curled",
      "middle": "curled",
      "ring": "curled",
      "pinky": "curled",
      "finger_spread": "tight"
    },
    {
      "id": "POINT_INDEX",
      "thumb": "resting",
      "index": "extended",
      "middle": "curled",
      "ring": "curled",
      "pinky": "curled",
      "finger_spread": "tight"
    },
    {
      "id": "PINCH_INDEX_THUMB",
      "thumb": "pinch_index",
      "index": "pinch_thumb",
      "middle": "half",
      "ring": "curled",
      "pinky": "curled",
      "finger_spread": "tight"
    },
    {
      "id": "CUP",
      "thumb": "half",
      "index": "half",
      "middle": "half",
      "ring": "half",
      "pinky": "half",
      "finger_spread": "tight"
    },
    {
      "id": "V_SIGN",
      "thumb": "tucked",
      "index": "extended",
      "middle": "extended",
      "ring": "curled",
      "pinky": "curled",
      "finger_spread": "split_index_middle"
    },
    {
      "id": "THUMBS_UP",
      "thumb": "up",
      "index": "curled",
      "middle": "curled",
      "ring": "curled",
      "pinky": "curled",
      "finger_spread": "tight"
    }
  ],
  "safety_limits": {
    "elbow_angle_deg": { "min": 45, "max": 170 },
    "forearm_heading_deg": { "min": -160, "max": 160 },
    "forearm_length_norm": { "min": 0.18, "max": 0.75 }
  },
  "moves": [
    // Generate one move for each timestamp
  ]
}
\`\`\`

## Move Object Structure

Each move in the "moves" array must have:

\`\`\`json
{
  "t_sec": 0.0,
  "lyric_fragment": "lyric text here",
  "intent": "Educational explanation of what this gesture teaches",
  "feet": {
    "left_tile": "W",
    "right_tile": "E"
  },
  "hands": {
    "left_shape": "OPEN_SPREAD",
    "right_shape": "OPEN_SPREAD"
  },
  "joints_2d_norm": {
    "left_elbow": { "x": -0.32, "y": 0.12 },
    "left_wrist": { "x": -0.70, "y": 0.48 },
    "right_elbow": { "x": 0.32, "y": 0.12 },
    "right_wrist": { "x": 0.70, "y": 0.48 }
  },
  "safety": {
    "left_elbow_angle_deg": 152.1,
    "right_elbow_angle_deg": 152.1,
    "left_forearm_heading_deg": 136.5,
    "right_forearm_heading_deg": 43.5,
    "left_forearm_length_norm": 0.52,
    "right_forearm_length_norm": 0.52,
    "is_safe": true,
    "danger_flags": []
  }
}
\`\`\`

## Important Rules

1. **Feet tiles**: Use one of: C, N, NE, E, SE, S, SW, W, NW
2. **Hand shapes**: Must be IDs from hand_shape_catalog
3. **Coordinates**:
   - x: -1 (far left) to 1 (far right)
   - y: -1 (low) to 1 (high)
   - Apply radial clamp: if r = sqrt(x² + y²) > 1, normalize to (x/r, y/r)
4. **Safety**: All moves must have is_safe: true
5. **Count**: Generate exactly ${timestamps.length} moves (one per timestamp)
6. **Educational**: Each move's "intent" should explain how it teaches the topic

## Output Format

Return ONLY the complete JSON object. No markdown, no explanations, just the JSON.
`;

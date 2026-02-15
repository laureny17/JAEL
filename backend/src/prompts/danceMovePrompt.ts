export const danceMovePrompt = (topic: string, chorus: string, timestamps: number[], lyricFragments: string[]) => `
You are an educational dance choreographer. Generate a pose sequence JSON for teaching "${topic}" through movement.

# Input Data
- Topic: ${topic}
- Chorus: ${chorus}
- Timestamps: ${JSON.stringify(timestamps)}
- Lyric Fragments: ${JSON.stringify(lyricFragments)}

# Physical Constraints (Hard Rules)

## Arm & Hand Geometry
- Shoulder Angle (0-180): 0 = arm hanging at side, 90 = arm horizontal (T-pose), 180 = arm straight overhead.
- Elbow Angle (0-180): 0 = fully bent (forearm folded against upper arm), 180 = fully extended (straight arm).
- Hand Shapes: ["open", "fist", "one", "peace", "three", "four", "heart", "flat", "pointing"] ONLY.

## Foot Grid (Cross-shaped, 5 positions)
\`\`\`
       T          Back (tiptoe stance)
    L  M  R       Middle (flat foot)
       B          Front (heel stance)
\`\`\`
- Grid Values: ["T", "L", "M", "R", "B"] ONLY.
- RULE: Both feet can ONLY occupy the same cell if that cell is "M".
- RULE (No Crossing): leftFoot cannot be to the right of rightFoot (e.g. leftFoot="L", rightFoot="R" is valid; leftFoot="R", rightFoot="L" is invalid).

# Motion Design
- Use timestamps exactly as provided.
- Smoothness: Avoid jerky transitions. Ensure arms and feet move in logical arcs.
- Educational: Each pose should teach the concept through meaningful gestures.
- Count: Generate exactly ${timestamps.length} poses (one per timestamp).

# Output Format
Return ONLY a valid JSON array of pose objects. No markdown blocks, no commentary.

[
  {
    "time": ${timestamps[0] ?? 0},
    "explanation": "Educational explanation of what this gesture teaches about ${topic}",
    "pose": {
      "leftShoulderAngle": 45,
      "rightShoulderAngle": 45,
      "leftElbowAngle": 180,
      "rightElbowAngle": 180,
      "leftHandShape": "open",
      "rightHandShape": "open",
      "leftFoot": "L",
      "rightFoot": "R"
    }
  }
]`;

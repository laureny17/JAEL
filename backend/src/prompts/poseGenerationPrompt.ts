export const poseGenerationPrompt = (
  fragments: Record<string, number>,
) => `# Role
Professional 3D Animation Engine. Convert lyric fragments into a valid JSON pose sequence.

# Input Data
- Fragments: ${JSON.stringify(fragments, null, 2)}

# 1. Physical Constraints (Hard Rules)
You MUST validate every pose against these rules before outputting:

## Arm & Hand Geometry
- Shoulder (0-180): 0 is down at sides, 90 is horizontal (T-pose), 180 is straight up.
- Elbow (0-180): 0 is fully bent (hand touching shoulder), 180 is straight arm.
- Hand Shapes: ["open", "fist", "one", "peace", "three", "four", "heart", "flat", "pointing"] ONLY.

## Foot Grid & Stance (3x3 Grid)
Rows: Top/Back (T), Middle (M), Bottom/Front (B).
Columns: Left (L), Center (C), Right (R).
- Grid Values: ["TL", "T", "TR", "L", "M", "R", "BL", "B", "BR"] ONLY.
- RULE: Both feet can ONLY occupy the same cell if that cell is "M".
- RULE (No Crossing): In any row, leftFoot column cannot be to the right of rightFoot column.
  - Valid: leftFoot="L", rightFoot="R"
  - Invalid: leftFoot="R", rightFoot="L"
- RULE (Row Logic):
  - Top (TL, T, TR) = Tiptoe/Back stance.
  - Middle (L, M, R) = Neutral/Flat stance.
  - Bottom (BL, B, BR) = Heel/Front stance.

# 2. Motion Design
- Use 'time' exactly as provided in the fragment start timestamps.
- Smoothness: Avoid jerky transitions. Ensure arms and feet move in logical arcs.
- Interpretation: If the lyric is "Sky", use high ShoulderAngles. If the lyric is "Look", use "pointing" hand shapes.

# 3. Output Requirements
Return ONLY a valid JSON array of objects. No markdown blocks, no commentary.

[
  {
    "time": 2.45,
    "explanation: "The lyric fragment 'Look at the sky' suggests a reaching motion, so we raise both arms to 120 degrees and use 'pointing' hand shapes. Feet are in a neutral stance.",
    "pose": {
      "leftShoulderAngle": 45,
      "rightShoulderAngle": 45,
      "leftElbowAngle": 180,
      "rightElbowAngle": 180,
      "leftHandShape": "open",
      "rightHandShape": "open",
      "leftFoot": "L",
      "rightFoot": "M"
    }
  }
]`;

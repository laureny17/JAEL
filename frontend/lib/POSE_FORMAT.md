# Pose Sequence JSON Format

A pose sequence is an array of timestamped keyframes. The frontend interpolates smoothly between keyframes to animate the 3D character.

## Structure

```json
[
  {
    "time": 0,
    "pose": {
      "leftShoulderAngle": 10,
      "rightShoulderAngle": 10,
      "leftElbowAngle": 160,
      "rightElbowAngle": 160,
      "leftHandShape": "open",
      "rightHandShape": "open",
      "leftFoot": "M",
      "rightFoot": "M"
    }
  },
  {
    "time": 1.5,
    "pose": { ... }
  }
]
```

## Fields

### `time` (number)

Seconds from the start of the sequence. Keyframes must be in chronological order. The sequence loops back to the beginning after the last keyframe.

### Arm Angles (degrees)

| Field | Range | Description |
|---|---|---|
| `leftShoulderAngle` | 0 - 180 | Angle between the spine (torso line) and the left upper arm. 0 = arm hanging at side, 90 = arm horizontal, 180 = arm straight overhead. |
| `rightShoulderAngle` | 0 - 180 | Same for the right arm. |
| `leftElbowAngle` | 0 - 180 | Non-reflex angle between upper arm and forearm. 0 = fully bent (forearm folded against upper arm), 180 = fully extended (straight arm). |
| `rightElbowAngle` | 0 - 180 | Same for the right arm. |

Arms are rendered in the 2D frontal plane (no depth). The shoulder angle rotates the arm outward/upward from the torso, and the elbow angle opens or closes the forearm relative to the upper arm.

### Hand Shapes

| Value | Description |
|---|---|
| `"open"` | All fingers extended, slight natural spread (5 fingers showing) |
| `"fist"` | All fingers and thumb curled tightly |
| `"one"` | Index finger extended, rest curled, thumb tucked |
| `"peace"` | Index + middle extended in a V shape, rest curled, thumb tucked |
| `"three"` | Index + middle + ring extended, rest curled, thumb tucked |
| `"four"` | All fingers except thumb extended, thumb tucked |
| `"heart"` | Thumbs up (thumb extended, all fingers curled) |
| `"flat"` | All fingers together, flat palm, thumb tucked to side |
| `"pointing"` | Index finger extended, rest curled, thumb tucked |

### Foot Positions

Feet are placed on a 3x3 grid. The grid is oriented from the character's perspective (facing the camera):

```
  Left   Center   Right
  ┌──────┬──────┬──────┐
  │  TL  │  T   │  TR  │  Back row (tiptoe stance)
  ├──────┼──────┼──────┤
  │  L   │  M   │  R   │  Middle row (flat foot)
  ├──────┼──────┼──────┤
  │  BL  │  B   │  BR  │  Front row (heel stance)
  └──────┴──────┴──────┘
```

| Value | Position |
|---|---|
| `"TL"` | Top-left (back-left, tiptoe) |
| `"T"` | Top-center (back, tiptoe) |
| `"TR"` | Top-right (back-right, tiptoe) |
| `"L"` | Middle-left (flat foot) |
| `"M"` | Middle-center (neutral stance, flat foot) |
| `"R"` | Middle-right (flat foot) |
| `"BL"` | Bottom-left (front-left, heel) |
| `"B"` | Bottom-center (front, heel) |
| `"BR"` | Bottom-right (front-right, heel) |

**Constraints:**
- Both feet on the same position is only allowed when both are `"M"`.
- In the same row, feet cannot cross (e.g., right foot can't be in left column if left foot is in the same row).

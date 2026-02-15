# JAEL Backend

AI-powered dance choreography generation system that creates synchronized 3D animations from song lyrics.

## 🎯 Overview

The JAEL backend orchestrates a multi-step workflow that:
1. **Generates lyrics** using Claude AI based on a topic/mood/genre
2. **Creates music** using the Suno API
3. **Transcribes audio** with OpenAI Whisper for word-level timestamps
4. **Groups lyrics** into semantic fragments (~2 beats each)
5. **Generates 3D poses** with physical constraints for animation

## 🏗️ Architecture

```
backend/
├── src/
│   ├── agents/          # Workflow orchestration
│   │   └── danceAgent.ts
│   ├── clients/         # External API integrations
│   │   ├── claudeClient.ts    # Claude AI (lyrics, fragments, poses)
│   │   ├── sunoClient.ts      # Suno API (music generation)
│   │   └── whisperClient.ts   # OpenAI Whisper (transcription)
│   ├── prompts/         # AI prompt templates
│   │   ├── poseGenerationPrompt.ts
│   │   └── ...
│   ├── types/           # TypeScript type definitions
│   │   └── dance.ts
│   ├── config/          # Configuration
│   │   └── env.ts
│   ├── cli/             # Command-line tools
│   │   └── test-workflow.ts
│   └── server.ts        # Express server (future API)
├── output/              # Generated artifacts (gitignored)
│   └── run-{timestamp}/
│       ├── audio.mp3
│       ├── lyrics.txt
│       ├── words.json
│       ├── fragments.json
│       ├── poses.json
│       ├── song.json
│       └── summary.txt
└── temp/                # Temporary files (gitignored)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API Keys:
  - Anthropic API key (Claude)
  - Suno API key
  - OpenAI API key (Whisper)

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create a `.env` file:

```env
# Claude AI
ANTHROPIC_API_KEY=your_anthropic_key

# Suno API
SUNO_API_BASE_URL=https://api.suno.ai/v1/
SUNO_API_KEY=your_suno_key

# OpenAI Whisper
OPENAI_API_KEY=your_openai_key
```

### Run the Workflow

```bash
npm run workflow
```

This will:
- Generate a song about "Freytag's pyramid" (upbeat pop)
- Create all artifacts in `output/run-{timestamp}/`

## 📦 Key Components

### 1. Dance Agent (`danceAgent.ts`)

Main workflow orchestrator. Coordinates all steps:

```typescript
import { startDanceProject } from './agents/danceAgent.js';

const song = await startDanceProject(
  "Freytag's pyramid",  // topic
  "upbeat",              // mood (optional)
  "pop"                  // genre (optional)
);
```

### 2. Claude Client (`claudeClient.ts`)

Handles all Claude AI interactions:

```typescript
// Generate lyrics
const lyrics = await generateLyrics(topic, mood, genre);

// Group into fragments with timestamps
const fragments = await groupLyricsIntoFragments(wordTimestamps);

// Generate 3D animation poses
const poses = await generatePoses(prompt);
```

### 3. Suno Client (`sunoClient.ts`)

Music generation via Suno API:

```typescript
// Submit track for generation
const track = await createSunoTrackFromLyrics(lyrics, genre);

// Poll for completion
const status = await getSunoTrackStatus(trackId);

// Download MP3
const localPath = await downloadSunoMp3(audioUrl, trackId);
```

### 4. Whisper Client (`whisperClient.ts`)

Audio transcription with word-level timestamps:

```typescript
const words = await getWordTimestamps(audioFilePath);
// Returns: [{ word: "Hello", start: 0.5, end: 0.8 }, ...]
```

## 🎨 Pose Generation

Poses follow strict physical constraints:

### Arm & Hand Geometry
- **Shoulder Angle** (0-180°): 0=down, 90=T-pose, 180=up
- **Elbow Angle** (0-180°): 0=bent, 180=straight
- **Hand Shapes**: `open`, `fist`, `one`, `peace`, `three`, `four`, `heart`, `flat`, `pointing`

### 3x3 Foot Grid
```
TL  T  TR    (Top/Back - Tiptoe)
L   M  R     (Middle - Neutral)
BL  B  BR    (Bottom/Front - Heel)
```

**Rules:**
- Both feet can only share cell "M"
- No crossing: left foot can't be right of right foot
- Sequential movement for smooth transitions

### Example Pose

```json
{
  "time": 5.64,
  "pose": {
    "leftShoulderAngle": 45,
    "rightShoulderAngle": 90,
    "leftElbowAngle": 180,
    "rightElbowAngle": 180,
    "leftHandShape": "open",
    "rightHandShape": "pointing",
    "leftFoot": "L",
    "rightFoot": "R"
  }
}
```

## 📊 Output Files

Each run creates a directory with:

| File | Description |
|------|-------------|
| `audio.mp3` | Generated song audio |
| `lyrics.txt` | Human-readable lyrics |
| `words.json` | Word-level timestamps from Whisper |
| `fragments.json` | Lyric fragments mapped to timestamps |
| `poses.json` | 3D animation pose sequence |
| `song.json` | Complete DanceSong object |
| `summary.txt` | Run statistics and metadata |

## 🔧 Development

### Run Tests

```bash
npm test
```

### Type Checking

```bash
npm run type-check
```

### Build

```bash
npm run build
```

## 📝 Type Definitions

### DanceSong

```typescript
type DanceSong = {
  lyrics: LyricResult;
  track: SunoTrackResult;
  stepChart?: DanceMove[];
  lyricFragments?: LyricFragmentResult;
};
```

### LyricResult

```typescript
type LyricResult = {
  title: string;
  lyrics: string;
};
```

### SunoTrackResult

```typescript
type SunoTrackResult = {
  trackId: string;
  status: "submitted" | "queued" | "streaming" | "complete" | "error";
  audioUrl?: string;
  bpm?: number;
};
```

## 🤝 Contributing

1. Follow the existing code structure
2. Add types for all new functions
3. Update this README for new features
4. Test with `npm run workflow`

## 📄 License

MIT

## 🙏 Acknowledgments

- **Claude AI** by Anthropic - Lyrics, fragments, and pose generation
- **Suno API** - Music generation
- **OpenAI Whisper** - Audio transcription
- **Freytag's Pyramid** - Narrative structure inspiration

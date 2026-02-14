# JAEL Backend2 - Dance Agent

This backend uses the Claude Agent SDK to orchestrate a dance project workflow.

## Workflow

1. **Generate Lyrics**: Takes a topic (and optional mood/genre) and generates song lyrics
2. **Generate Music**: Uses the Suno API to create music from the generated lyrics
3. **Create Step Chart**: (To be implemented) Assigns dance moves to strategic timestamps

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=4000
ANTHROPIC_API_KEY=your_anthropic_key
SUNO_API_KEY=your_suno_key
SUNO_API_BASE_URL=https://api.suno.ai
```

3. Run the development server:
```bash
npm run dev
```

## API Endpoints

### POST /api/dance/create

Create a new dance project.

**Request Body:**
```json
{
  "topic": "summer vibes",
  "mood": "upbeat",
  "genre": "pop"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lyrics": {
      "title": "Song about summer vibes",
      "lyrics": "..."
    },
    "track": {
      "trackId": "...",
      "status": "queued",
      "audioUrl": "...",
      "bpm": 120
    }
  }
}
```

## Architecture

- **Agent**: `src/agents/danceAgent.ts` - Orchestrates the workflow using Claude Agent SDK
- **Tools**: `src/agents/tools.ts` - Defines the tools available to the agent (generate_lyrics, generate_music, save_step_chart)
- **Client**: `src/clients/sunoClient.ts` - Handles communication with Suno API
- **Routes**: `src/routes/danceRoutes.ts` - Express routes for the API
- **Types**: `src/types/dance.ts` - TypeScript type definitions

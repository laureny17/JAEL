import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db/db.js";
import { startDanceProject } from "../agents/danceAgent.js";

const router = Router();

function toLengthPreset(value: unknown): 60 | 90 | 120 {
  if (value === 60 || value === 90 || value === 120) return value;
  if (typeof value !== "number") return 60;
  if (value <= 75) return 60;
  if (value <= 105) return 90;
  return 120;
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const { prompt, audienceDescriptor, lengthSeconds, mood, genre } = req.body;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const safeLength = toLengthPreset(lengthSeconds);

    const topic = prompt.trim();
    const safeMood = typeof mood === "string" && mood.trim().length > 0 ? mood.trim() : undefined;
    const safeGenre = typeof genre === "string" && genre.trim().length > 0 ? genre.trim() : undefined;

    const pipeline = await startDanceProject(topic, safeLength, safeMood, safeGenre, safeLength);
    const poses = Array.isArray(pipeline.poses) ? pipeline.poses : [];
    const computedLengthSeconds = poses.length > 0
      ? Math.ceil(poses[poses.length - 1].time ?? safeLength)
      : safeLength;

    const doc = {
      prompt: topic,
      audienceDescriptor: typeof audienceDescriptor === "string" ? audienceDescriptor.trim() : "",
      mood: safeMood,
      genre: safeGenre,
      title: pipeline.lyrics?.title || "Untitled",
      lengthSeconds: computedLengthSeconds,
      audioUrl: pipeline.track?.audioUrl || (pipeline.track as { audio_url?: string })?.audio_url,
      lyrics: pipeline.lyrics,
      track: pipeline.track,
      poses,
      generation: {
        status: "complete",
        generatedAt: new Date(),
      },
      createdAt: new Date()
    };

    const result = await getDb().collection("songs").insertOne(doc);
    res.json({
      id: result.insertedId.toString(),
      title: doc.title,
      lengthSeconds: doc.lengthSeconds,
    });
  } catch (err) {
    console.error("[POST /api/songs] Generation + save failed:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const status = /Suno request failed:\s*503/.test(errorMessage) ? 503 : 500;
    res.status(status).json({ error: errorMessage });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const songs = await getDb()
      .collection("songs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(24)
      .toArray();

    res.json({
      songs: songs.map((song) => ({
        id: song._id.toString(),
        title: song.title || song.lyrics?.title || "Untitled",
        prompt: song.prompt,
        lengthSeconds: song.lengthSeconds,
        createdAt: song.createdAt,
        generatedAt: song.generation?.generatedAt || song.createdAt,
        hasPipelineData: Array.isArray(song.poses) && song.poses.length > 0,
      }))
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

router.get("/:songId", async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const _id = new ObjectId(songId);

    const song = await getDb().collection("songs").findOne({ _id });
    if (!song) {
      res.status(404).json({ error: "Song not found" });
      return;
    }

    res.json({
      song: {
        id: song._id.toString(),
        prompt: song.prompt,
        audienceDescriptor: song.audienceDescriptor,
        mood: song.mood,
        genre: song.genre,
        title: song.title || song.lyrics?.title || "Untitled",
        lengthSeconds: song.lengthSeconds,
        createdAt: song.createdAt,
        generatedAt: song.generation?.generatedAt || song.createdAt,
        lyrics: song.lyrics,
        track: song.track,
        poses: Array.isArray(song.poses) ? song.poses : [],
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

router.get("/:songId/leaderboard", async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const limit = Math.min(50, parseInt(String(req.query.limit || "20"), 10));
    const _id = new ObjectId(songId);

    const scores = await getDb()
      .collection("scores")
      .find({ songId: _id })
      .sort({ score: -1, createdAt: 1 })
      .limit(limit)
      .toArray();

    res.json({
      scores: scores.map((score) => ({
        id: score._id.toString(),
        name: score.name,
        score: score.score,
        createdAt: score.createdAt
      }))
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

router.post("/:songId/scores", async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const { name, score } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (typeof score !== "number" || Number.isNaN(score)) {
      res.status(400).json({ error: "Score must be a number" });
      return;
    }

    const _id = new ObjectId(songId);
    const doc = {
      songId: _id,
      name: name.trim().slice(0, 40),
      score,
      createdAt: new Date()
    };

    await getDb().collection("scores").insertOne(doc);
    res.json({ success: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db/db.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { prompt, audienceDescriptor, lengthSeconds, title, audioUrl } = req.body;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const doc = {
      prompt: prompt.trim(),
      audienceDescriptor: typeof audienceDescriptor === "string" ? audienceDescriptor.trim() : "",
      lengthSeconds: typeof lengthSeconds === "number" ? lengthSeconds : undefined,
      title: typeof title === "string" ? title.trim() : "Untitled",
      audioUrl: typeof audioUrl === "string" ? audioUrl : undefined,
      createdAt: new Date()
    };

    const result = await getDb().collection("songs").insertOne(doc);
    res.json({ id: result.insertedId.toString() });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
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
        title: song.title,
        prompt: song.prompt,
        lengthSeconds: song.lengthSeconds,
        createdAt: song.createdAt
      }))
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

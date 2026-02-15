import { Router, Request, Response } from "express";
import { startDanceProject } from "../agents/danceAgent.js";

const router = Router();

router.post("/create", async (req: Request, res: Response) => {
  try {
    const { topic, mood, genre } = req.body;

    if (!topic) {
      res.status(400).json({ error: "Topic is required" });
      return;
    }

    const finalResult = await startDanceProject(topic, mood, genre);
    res.json({ success: true, data: finalResult });
  } catch (err) {
    console.error("[POST /api/dance/create] Pipeline failed:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;

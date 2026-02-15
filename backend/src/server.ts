import express from "express";
import { env } from "./config/env.js";
import danceRoutes from "./routes/danceRoutes.js";
import { connectMongo } from "./db/mongo.js";
import songRoutes from "./routes/songRoutes.js";

const app = express();

app.use(express.json());

app.use("/api/dance", danceRoutes);
app.use("/api/songs", songRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await connectMongo();
  app.listen(env.port, () => {
    console.log(`Backend server running on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

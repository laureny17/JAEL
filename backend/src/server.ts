import express from "express";
import { env } from "./config/env.js";
import danceRoutes from "./routes/danceRoutes.js";

const app = express();

app.use(express.json());

app.use("/api/dance", danceRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(env.port, () => {
  console.log(`Backend2 server running on port ${env.port}`);
});

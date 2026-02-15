import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["ANTHROPIC_API_KEY", "SUNO_API_KEY"] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: parseInt(process.env.PORT || "3001", 10),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  sunoApiKey: process.env.SUNO_API_KEY || "",
  sunoApiBaseUrl: process.env.SUNO_API_BASE_URL || "https://studio-api.prod.suno.com"
};

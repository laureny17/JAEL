import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["ANTHROPIC_API_KEY", "SUNO_API_KEY"] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4001),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY as string,
  sunoApiKey: process.env.SUNO_API_KEY as string,
  sunoApiBaseUrl: process.env.SUNO_API_BASE_URL ?? "https://studio-api.prod.suno.com/api/v2/external/hackathons/"
};

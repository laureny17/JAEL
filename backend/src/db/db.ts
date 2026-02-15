import { env } from "../config/env.js";
import { getMongoClient } from "./mongo.js";

function inferDbName(): string {
  if (env.mongoDbName) return env.mongoDbName;
  const uri = env.mongoConnectionString;
  const normalized = uri.replace("mongodb+srv://", "mongodb://");
  try {
    const url = new URL(normalized);
    const pathname = url.pathname.replace(/^\//, "");
    if (pathname) return pathname.split("?")[0];
  } catch {
    // fall through
  }
  return "jael";
}

export function getDb() {
  const client = getMongoClient();
  return client.db(inferDbName());
}

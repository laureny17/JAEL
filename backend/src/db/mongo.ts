import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

let client: MongoClient | null = null;

export async function connectMongo(): Promise<MongoClient> {
  if (client) return client;
  client = new MongoClient(env.mongoConnectionString);
  await client.connect();
  console.log("✅ MongoDB connected");
  return client;
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error("MongoDB client not initialized. Call connectMongo() first.");
  }
  return client;
}

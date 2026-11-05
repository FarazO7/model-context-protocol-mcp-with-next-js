import { MongoClient } from "mongodb";
import type { AppEvent, Client, Engagement, Milestone, Objection, User, Workspace } from "./schema";

// One client per process, reused across dev reloads and warm serverless invocations.
const cache = globalThis as unknown as { mongo?: MongoClient };

export function mongo(): MongoClient {
  if (!cache.mongo) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI is not set. Add it to .env.local or the Vercel project settings.");
    cache.mongo = new MongoClient(uri);
  }
  return cache.mongo;
}

export function db() {
  const d = mongo().db("proofflow");
  return {
    raw: d,
    workspaces: d.collection<Workspace>("workspaces"),
    users: d.collection<User>("users"),
    clients: d.collection<Client>("clients"),
    engagements: d.collection<Engagement>("engagements"),
    milestones: d.collection<Milestone>("milestones"),
    objections: d.collection<Objection>("objections"),
    events: d.collection<AppEvent>("events"),
  };
}

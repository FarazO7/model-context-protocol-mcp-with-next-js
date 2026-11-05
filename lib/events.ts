import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import type { AppEvent } from "@/lib/db/schema";

/** Every state change writes event rows naming their actor (CLAUDE.md rule 3). */
export async function logEvents(rows: Omit<AppEvent, "_id" | "at">[], at = new Date()) {
  if (rows.length) await db().events.insertMany(rows.map((row) => ({ _id: new ObjectId(), at, ...row })));
}

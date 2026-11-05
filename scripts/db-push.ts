// Creates the MongoDB indexes. Safe to rerun. Usage: npm run db:push
import { db, mongo } from "../lib/db/index.ts";
import { ensureIndexes } from "../lib/db/schema.ts";

try {
  await ensureIndexes(db().raw);
  console.log("Indexes are in place.");
} finally {
  await mongo().close();
}

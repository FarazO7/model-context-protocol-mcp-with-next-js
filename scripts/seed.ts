// Resets the fictional demo workspace. Dates are relative to today in Asia/Kolkata.
// Only the demo workspace's data is deleted; its workspace and user rows are kept, so sessions survive.
// Usage: npm run db:seed
import { db, mongo } from "../lib/db/index.ts";
import { ensureIndexes } from "../lib/db/schema.ts";
import { hashPassword } from "../lib/crypto.ts";
import { resetDemoData } from "../lib/demo.ts";
import { todayIST } from "../lib/rules.ts";

const { SEED_USER_EMAIL, SEED_USER_PASSWORD, SEED_MCP_KEY } = process.env;
if (!SEED_USER_EMAIL || !SEED_USER_PASSWORD || !SEED_MCP_KEY) {
  throw new Error("Set SEED_USER_EMAIL, SEED_USER_PASSWORD and SEED_MCP_KEY in .env.local.");
}

const c = db();

try {
  await ensureIndexes(c.raw);

  const workspace = await c.workspaces.findOneAndUpdate(
    { mcp_key: SEED_MCP_KEY },
    {
      $set: {
        name: "Brightfield Digital Pvt Ltd",
        udyam_number: "UDYAM-KA-00-0000000", // dummy
        objection_window_days: 15,
        agreed_payment_days: 30,
        written_agreement: true,
        demo: true, // lets the app's Reset demo data button run here, and nowhere else
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!workspace) throw new Error("Could not create the demo workspace.");
  const ws = workspace._id;

  await c.users.updateOne(
    { email: SEED_USER_EMAIL.toLowerCase() },
    { $set: { workspace_id: ws, name: "Kabir Mehta", password_hash: hashPassword(SEED_USER_PASSWORD) } },
    { upsert: true },
  );

  await resetDemoData(ws, "system");

  const count = (name: string) => c.raw.collection(name).countDocuments({ workspace_id: ws });
  console.log(`Seeded ${workspace.name} for ${todayIST()} (IST).`);
  console.log(`Login: ${SEED_USER_EMAIL.toLowerCase()} (password in .env.local)`);
  console.log(
    `Counts: ${await count("clients")} clients, ${await count("engagements")} engagements, ` +
      `${await count("milestones")} milestones, ${await count("objections")} objections, ${await count("events")} events.`,
  );
} finally {
  await mongo().close();
}

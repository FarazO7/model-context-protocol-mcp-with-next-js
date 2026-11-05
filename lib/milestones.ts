import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import type { Actor, Client, Engagement, Milestone, Workspace } from "@/lib/db/schema";
import { withoutNumber } from "@/lib/edits";
import { logEvents } from "@/lib/events";
import { milestoneClock, todayIST, type Clock } from "@/lib/rules";

// Workspace-scoped reads and writes shared by the MCP tools and the app pages.
// Every query filters on the workspace, so one workspace never sees another's data.

/** A problem the caller can fix. Its message is a plain sentence, safe to show to Claude or the user. */
export class UserError extends Error {}

function appUrl(path: string): string {
  const base = process.env.APP_URL;
  if (!base) throw new Error("APP_URL is not set.");
  return new URL(path, base).toString();
}

export const dashboardUrl = () => appUrl("/dashboard");
export const milestoneUrl = (id: ObjectId) => appUrl(`/milestones/${id.toHexString()}`);
export const reviewUrl = (token: string) => appUrl(`/r/${token}`);

export interface MilestoneRow {
  milestone: Milestone;
  engagement: Engagement;
  client: Client;
  clock: Clock;
}

const hex = (id: ObjectId) => id.toHexString();

export async function listMilestones(ws: Workspace): Promise<MilestoneRow[]> {
  const c = db();
  const scope = { workspace_id: ws._id };
  const [clients, engagements, milestones, objections] = await Promise.all([
    c.clients.find(scope).toArray(),
    c.engagements.find(scope).toArray(),
    c.milestones.find(scope).toArray(),
    c.objections.find(scope).toArray(),
  ]);
  const clientById = new Map(clients.map((x) => [hex(x._id), x]));
  const engagementById = new Map(engagements.map((x) => [hex(x._id), x]));
  const today = todayIST();

  return milestones
    .flatMap((milestone) => {
      const engagement = engagementById.get(hex(milestone.engagement_id));
      const client = engagement && clientById.get(hex(engagement.client_id));
      if (!engagement || !client) return [];
      const own = objections.filter((o) => o.milestone_id.equals(milestone._id));
      return [{ milestone, engagement, client, clock: milestoneClock(milestone, own, ws, today) }];
    })
    .sort(
      (a, b) =>
        a.client.name.localeCompare(b.client.name) ||
        a.engagement.title.localeCompare(b.engagement.title) ||
        a.milestone.seq - b.milestone.seq,
    );
}

export async function getMilestone(ws: Workspace, id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const c = db();
  const milestone = await c.milestones.findOne({ _id: new ObjectId(id), workspace_id: ws._id });
  if (!milestone) return null;
  const scope = { milestone_id: milestone._id, workspace_id: ws._id };
  const [engagement, objections, events] = await Promise.all([
    c.engagements.findOne({ _id: milestone.engagement_id, workspace_id: ws._id }),
    c.objections.find(scope).sort({ raised_at: 1 }).toArray(),
    c.events.find(scope).sort({ at: -1 }).limit(20).toArray(),
  ]);
  const client = engagement && (await c.clients.findOne({ _id: engagement.client_id, workspace_id: ws._id }));
  if (!engagement || !client) return null;
  return { milestone, engagement, client, objections, events, clock: milestoneClock(milestone, objections, ws) };
}

export interface NewEngagement {
  client: { name: string; approver_name: string; approver_email: string };
  title: string;
  contract_ref: string;
  summary: string;
  milestones: { title: string; description: string; amount_inr: number; acceptance_criteria: string[] }[];
}

const caseInsensitive = { locale: "en", strength: 2 };

export async function createEngagement(ws: Workspace, input: NewEngagement, actor: Actor) {
  const c = db();
  const existing = await c.engagements.findOne(
    { workspace_id: ws._id, contract_ref: input.contract_ref },
    { collation: caseInsensitive },
  );
  if (existing) {
    throw new UserError(
      `An engagement with contract reference ${input.contract_ref} already exists ("${existing.title}"). ` +
        "Don't create it again. Call list_milestones to see its milestones.",
    );
  }

  const client = await c.clients.findOneAndUpdate(
    { workspace_id: ws._id, name: input.client.name },
    { $set: { approver_name: input.client.approver_name, approver_email: input.client.approver_email } },
    { upsert: true, returnDocument: "after", collation: caseInsensitive },
  );
  if (!client) throw new Error("Client upsert returned nothing.");

  const now = new Date();
  const engagement: Engagement = {
    _id: new ObjectId(),
    workspace_id: ws._id,
    client_id: client._id,
    title: input.title,
    contract_ref: input.contract_ref,
    summary_md: input.summary,
    created_at: now,
  };
  const milestones: Milestone[] = input.milestones.map((m, i) => ({
    _id: new ObjectId(),
    workspace_id: ws._id,
    engagement_id: engagement._id,
    seq: i + 1,
    title: withoutNumber(m.title),
    description: m.description,
    amount_inr: m.amount_inr,
    criteria: m.acceptance_criteria.map((text, j) => ({ id: String.fromCharCode(97 + j), text })),
    delivered_on: null,
    pack_md: "",
    evidence: [],
    review_token: null,
    client_accepted_at: null,
    client_accepted_by: null,
    invoiced_on: null,
    paid_on: null,
    created_at: now,
    updated_at: now,
  }));

  await c.engagements.insertOne(engagement);
  await c.milestones.insertMany(milestones);
  await logEvents(
    milestones.map((m) => ({
      workspace_id: ws._id,
      milestone_id: m._id,
      actor,
      type: "milestone_created",
      data: { engagement: engagement.title, title: m.title, amount_inr: m.amount_inr },
    })),
    now,
  );
  return { engagement, client, milestones };
}

type Editable = Pick<Milestone, "title" | "description" | "amount_inr" | "criteria" | "pack_md" | "evidence">;

/** Saves the fields that changed and logs one event naming them. Returns false when nothing changed. */
export async function updateMilestone(ws: Workspace, id: string, patch: Partial<Editable>, actor: Actor) {
  const found = await getMilestone(ws, id);
  if (!found) throw new UserError("That milestone isn't in this workspace.");
  const m = found.milestone;
  const changed = (Object.keys(patch) as (keyof Editable)[]).filter(
    (k) => JSON.stringify(m[k]) !== JSON.stringify(patch[k]),
  );
  if (!changed.length) return false;

  if (patch.criteria) {
    const kept = new Set(patch.criteria.map((c) => c.id));
    const named = found.objections.flatMap((o) => o.criteria_ids).find((cid) => !kept.has(cid));
    if (named) throw new UserError(`Criterion (${named}) is named in an objection, so it can't be removed.`);
  }

  const set = Object.fromEntries(changed.map((k) => [k, patch[k]])) as Partial<Editable>;
  await db().milestones.updateOne({ _id: m._id, workspace_id: ws._id }, { $set: { ...set, updated_at: new Date() } });
  const changes = Object.fromEntries(
    changed.map((k) => [k, k === "amount_inr" || k === "title" ? { from: m[k], to: patch[k] } : true]),
  );
  await logEvents([{ workspace_id: ws._id, milestone_id: m._id, actor, type: "milestone_updated", data: { changes } }]);
  return true;
}

/** Records today (IST) as the invoiced or paid date. Invoicing needs acceptance; payment needs an invoice. */
export async function markMilestone(ws: Workspace, id: string, what: "invoiced" | "paid", actor: Actor) {
  const found = await getMilestone(ws, id);
  if (!found) throw new UserError("That milestone isn't in this workspace.");
  const { status } = found.clock;
  if (what === "invoiced" && status !== "accepted" && status !== "deemed_accepted") {
    throw new UserError("Only an accepted milestone can be marked invoiced.");
  }
  if (what === "paid" && status !== "invoiced") throw new UserError("Mark the milestone invoiced before marking it paid.");

  const field = what === "invoiced" ? "invoiced_on" : "paid_on";
  const today = todayIST();
  const _id = found.milestone._id;
  await db().milestones.updateOne({ _id, workspace_id: ws._id }, { $set: { [field]: today, updated_at: new Date() } });
  await logEvents([{ workspace_id: ws._id, milestone_id: _id, actor, type: `marked_${what}`, data: { [field]: today } }]);
}

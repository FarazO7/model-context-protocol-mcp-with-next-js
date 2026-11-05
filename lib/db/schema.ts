import type { Db, ObjectId } from "mongodb";

// Calendar dates are "YYYY-MM-DD" strings in Asia/Kolkata. Timestamps are Dates.
// Money is whole rupees. Status and deadlines are derived on read and never stored.
export type CalendarDate = string;
export type Actor = "supplier" | "client" | "claude" | "system";

export interface Workspace {
  _id: ObjectId;
  name: string;
  udyam_number: string;
  objection_window_days: number;
  agreed_payment_days: number;
  written_agreement: boolean;
  mcp_key: string;
  /** Set by the seed. Only a demo workspace can be reset from the app. */
  demo?: boolean;
}

export interface User {
  _id: ObjectId;
  workspace_id: ObjectId;
  email: string;
  password_hash: string;
  name: string;
}

export interface Client {
  _id: ObjectId;
  workspace_id: ObjectId;
  name: string;
  approver_name: string;
  approver_email: string;
}

export interface Engagement {
  _id: ObjectId;
  workspace_id: ObjectId;
  client_id: ObjectId;
  title: string;
  contract_ref: string;
  summary_md: string;
  created_at: Date;
}

export interface Milestone {
  _id: ObjectId;
  workspace_id: ObjectId;
  engagement_id: ObjectId;
  seq: number;
  title: string;
  description: string;
  amount_inr: number;
  criteria: { id: string; text: string }[];
  delivered_on: CalendarDate | null;
  pack_md: string;
  evidence: { label: string; url: string }[];
  review_token: string | null;
  client_accepted_at: Date | null;
  client_accepted_by: string | null;
  invoiced_on: CalendarDate | null;
  paid_on: CalendarDate | null;
  created_at: Date;
  updated_at: Date;
}

export interface Objection {
  _id: ObjectId;
  workspace_id: ObjectId;
  milestone_id: ObjectId;
  criteria_ids: string[];
  note: string;
  raised_by: string;
  raised_at: Date;
  outside_window: boolean;
  resolved_at: Date | null;
  resolution_md: string | null;
}

export interface AppEvent {
  _id: ObjectId;
  workspace_id: ObjectId;
  milestone_id: ObjectId | null;
  actor: Actor;
  type: string;
  data: Record<string, unknown>;
  at: Date;
}

// Safe to run any number of times: createIndex is a no-op when the index exists.
export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("workspaces").createIndex({ mcp_key: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("clients").createIndex({ workspace_id: 1, name: 1 }),
    db.collection("engagements").createIndex({ workspace_id: 1, created_at: -1 }),
    // Partial, so milestones without a review link yet don't collide on null.
    db.collection("milestones").createIndex(
      { review_token: 1 },
      { unique: true, partialFilterExpression: { review_token: { $type: "string" } } },
    ),
    db.collection("milestones").createIndex({ workspace_id: 1, engagement_id: 1, seq: 1 }),
    db.collection("objections").createIndex({ milestone_id: 1, raised_at: -1 }),
    db.collection("events").createIndex({ milestone_id: 1, at: -1 }),
    db.collection("events").createIndex({ workspace_id: 1, at: -1 }),
  ]);
}

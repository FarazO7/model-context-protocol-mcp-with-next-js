"use server";

import type { FormState } from "@/components/action-form";
import { attempt } from "@/lib/action";
import { signature } from "@/lib/edits";
import { clientAccept, clientObject } from "@/lib/milestones";

// Public actions: no session. The token from the page is re-checked against the database in lib.
// The typed name is a signature: any name is accepted as typed, and a mismatch is only flagged to the supplier.
// Each error names its field, so the form can point the client at it.

export async function acceptMilestone(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  const name = signature(form.get("name"));
  if ("error" in name) return { error: name.error, field: "name" };
  return attempt(() => clientAccept(token, name.ok), "Thank you. Your acceptance is recorded.");
}

export async function raiseObjection(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  const criteria_ids = form.getAll("criteria").map(String);
  const note = String(form.get("note") ?? "").trim();
  const name = signature(form.get("name"));
  if (!criteria_ids.length) return { error: "Tick at least one criterion that isn't met.", field: "criteria" };
  if (!note) return { error: "Say what isn't met.", field: "note" };
  if (note.length > 2000) return { error: "Keep the note under 2,000 characters.", field: "note" };
  if ("error" in name) return { error: name.error, field: "name" };
  return attempt(() => clientObject(token, { name: name.ok, note, criteria_ids }), "Your objection is recorded.");
}

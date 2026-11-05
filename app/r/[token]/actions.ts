"use server";

import type { FormState } from "@/components/action-form";
import { attempt } from "@/lib/action";
import { clientAccept, clientObject } from "@/lib/milestones";

// Public actions: no session. The token from the page is re-checked against the database in lib.

const nameOf = (form: FormData) => String(form.get("name") ?? "").trim();

export async function acceptMilestone(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  const name = nameOf(form);
  if (!name || name.length > 100) return { error: "Type your full name to accept." };
  return attempt(() => clientAccept(token, name), "Thank you. Your acceptance is recorded.");
}

export async function raiseObjection(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  const criteria_ids = form.getAll("criteria").map(String);
  const note = String(form.get("note") ?? "").trim();
  const name = nameOf(form);
  if (!criteria_ids.length) return { error: "Tick at least one criterion that isn't met." };
  if (!note || note.length > 2000) return { error: "Say what isn't met, in under 2,000 characters." };
  if (!name || name.length > 100) return { error: "Type your full name to raise the objection." };
  return attempt(() => clientObject(token, { name, note, criteria_ids }), "Your objection is recorded.");
}

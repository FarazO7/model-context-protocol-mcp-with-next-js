"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/action-form";
import { requireSession } from "@/lib/auth";
import { parseEvidence, reviseCriteria } from "@/lib/edits";
import { getMilestone, markMilestone, updateMilestone, UserError } from "@/lib/milestones";

// Every action re-checks the session; the milestone id comes from the browser and is scoped to the workspace in lib.

async function attempt(work: () => Promise<unknown>): Promise<FormState> {
  try {
    const changed = await work();
    refresh();
    return { ok: changed === false ? "Nothing to save." : "Saved." };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error("Milestone action failed", e);
    return { error: "Something went wrong. Reload the page to see what was saved." };
  }
}

const details = z.object({
  title: z.string().trim().min(1, { error: "Give the milestone a title." }).max(200, { error: "Keep the title under 200 characters." }),
  description: z.string().trim().max(2000, { error: "Keep the description under 2,000 characters." }),
  // Accepts "4,80,000" or "₹480000"; an empty box becomes NaN so it fails as "not a number".
  amount_inr: z.preprocess(
    (v) => Number(String(v ?? "").replace(/[₹,\s]/g, "") || NaN),
    z
      .number({ error: "The amount must be a number of rupees." })
      .int({ error: "The amount must be whole rupees, with no paise." })
      .positive({ error: "The amount must be more than zero." })
      .max(1_000_000_000, { error: "That amount is too large." }),
  ),
});

export async function saveDetails(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { workspace } = await requireSession();
  const parsed = details.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return attempt(() => updateMilestone(workspace, id, parsed.data, "supplier"));
}

export async function saveCriteria(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { workspace } = await requireSession();
  const found = await getMilestone(workspace, id);
  if (!found) return { error: "That milestone isn't in this workspace." };
  const current = found.milestone.criteria;
  const texts = Object.fromEntries(current.map((c) => [c.id, form.get(`text_${c.id}`)?.toString()]));
  const result = reviseCriteria(current, { texts, add: String(form.get("add") ?? ""), op: String(form.get("op") ?? "save") });
  if ("error" in result) return { error: result.error };
  return attempt(() => updateMilestone(workspace, id, { criteria: result.ok }, "supplier"));
}

export async function savePack(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { workspace } = await requireSession();
  const pack_md = String(form.get("pack_md") ?? "").trim();
  if (pack_md.length > 20_000) return { error: "Keep the pack under 20,000 characters." };
  const evidence = parseEvidence(String(form.get("evidence") ?? ""));
  if ("error" in evidence) return { error: evidence.error };
  return attempt(() => updateMilestone(workspace, id, { pack_md, evidence: evidence.ok }, "supplier"));
}

export async function mark(id: string, what: "invoiced" | "paid"): Promise<FormState> {
  const { workspace } = await requireSession();
  if (what !== "invoiced" && what !== "paid") return { error: "That action isn't available." };
  return attempt(() => markMilestone(workspace, id, what, "supplier"));
}

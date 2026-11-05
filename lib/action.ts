import { refresh } from "next/cache";
import type { FormState } from "@/components/action-form";
import { UserError } from "@/lib/milestones";

/** Runs a server action's work: refreshes the page on success and turns errors into plain sentences. */
export async function attempt(work: () => Promise<unknown>, ok = "Saved."): Promise<FormState> {
  try {
    const changed = await work();
    refresh();
    return { ok: changed === false ? "Nothing to save." : ok };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error("Action failed", e);
    return { error: "Something went wrong. Reload the page to see what was saved." };
  }
}

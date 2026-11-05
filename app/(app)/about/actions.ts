"use server";

import type { FormState } from "@/components/action-form";
import { attempt } from "@/lib/action";
import { requireSession } from "@/lib/auth";
import { resetDemoData } from "@/lib/demo";

export async function resetDemo(_prev: FormState, form: FormData): Promise<FormState> {
  const { workspace } = await requireSession();
  if (!workspace.demo) return { error: "Only the demo workspace can be reset." };
  if (form.get("confirm") !== "yes") return { error: "Tick the box to confirm the reset." };
  return attempt(() => resetDemoData(workspace._id, "supplier"), "Done. The demo data now starts from today.");
}

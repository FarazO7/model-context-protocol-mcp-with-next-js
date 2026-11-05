import type { Milestone } from "./db/schema";

// Pure checks for what the supplier types into the milestone page and what Claude sends.

type Criterion = Milestone["criteria"][number];
type Evidence = Milestone["evidence"][number];
type Result<T> = { ok: T } | { error: string };

/** Strips numbering like "M1." or "Milestone 2:" from a title. ProofFlow numbers milestones itself. */
export function withoutNumber(title: string): string {
  return title.replace(/^\s*(?:m|milestone)\s*\d+\s*[.:)\-–]?\s+/i, "").trim() || title.trim();
}

/**
 * Applies one submit of the criteria form: edited texts, then an optional move or removal, then an optional new one.
 * Letters never change, because objections and packs refer to them.
 */
export function reviseCriteria(
  current: Criterion[],
  form: { texts: Record<string, string | undefined>; add: string; op: string },
): Result<Criterion[]> {
  const list = current.map((c) => ({ id: c.id, text: (form.texts[c.id] ?? c.text).trim() }));
  const [verb, target] = form.op.split(":");
  const i = list.findIndex((c) => c.id === target);
  if (verb === "remove" && i >= 0) list.splice(i, 1);
  if (verb === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
  if (verb === "down" && i >= 0 && i < list.length - 1) [list[i], list[i + 1]] = [list[i + 1], list[i]];

  const add = form.add.trim();
  if (add) {
    // shortcut: a letter removed in an earlier save can be reused; fine while packs are rewritten on each submission.
    const highest = Math.max(96, ...current.map((c) => c.id.charCodeAt(0)));
    if (highest >= 122) return { error: "A milestone can have at most 26 criteria." };
    list.push({ id: String.fromCharCode(highest + 1), text: add });
  }

  const bad = list.find((c) => !c.text || c.text.length > 500);
  if (bad) {
    return {
      error: bad.text
        ? `Criterion (${bad.id}) is too long. Keep it under 500 characters.`
        : `Criterion (${bad.id}) is empty. Write it or remove it.`,
    };
  }
  if (!list.length) return { error: "Keep at least one acceptance criterion." };
  return { ok: list };
}

/** Reads evidence typed one per line as "Label | https://link". Only http and https links are allowed. */
export function parseEvidence(text: string): Result<Evidence[]> {
  const out: Evidence[] = [];
  for (const [n, raw] of text.split("\n").entries()) {
    const line = raw.trim();
    if (!line) continue;
    const bar = line.lastIndexOf("|");
    const label = (bar >= 0 ? line.slice(0, bar) : "").trim();
    const url = (bar >= 0 ? line.slice(bar + 1) : line).trim();
    let ok = false;
    try {
      ok = ["http:", "https:"].includes(new URL(url).protocol);
    } catch {}
    if (!ok || url.length > 2000) return { error: `Line ${n + 1} of the evidence needs a link starting with https://.` };
    out.push({ label: (label || url).slice(0, 200), url });
  }
  if (out.length > 30) return { error: "Add at most 30 evidence links." };
  return { ok: out };
}

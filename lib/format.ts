import type { AppEvent } from "./db/schema";
import { daysBetween, istTimestamp, type Clock, type Status } from "./rules";

// How ProofFlow shows money, dates, statuses and events. British English, no em dashes.

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const inr = (amount: number) => rupees.format(amount);

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
/** "2026-11-16" as "16 Nov 2026". */
export const day = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`));
/** A moment in India time, as "4 Nov 2026, 16:20". */
export function dateTime(at: Date): string {
  const ts = istTimestamp(at);
  return `${day(ts.slice(0, 10))}, ${ts.slice(11, 16)}`;
}

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  awaiting_acceptance: "Awaiting acceptance",
  objection_open: "Objection open",
  accepted: "Accepted",
  deemed_accepted: "Deemed accepted",
  invoiced: "Invoiced",
  paid: "Paid",
};

export const ACTOR_LABEL: Record<AppEvent["actor"], string> = {
  supplier: "You",
  client: "Client",
  claude: "Claude",
  system: "System",
};

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const andList = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
export const letters = (ids: string[]) => andList(ids.map((id) => `(${id})`));

/** The deadline chip for a milestone, or null when there is no deadline to show. */
export function chip(clock: Clock, today: string): string | null {
  if (clock.status === "awaiting_acceptance" && clock.window_end) {
    const n = daysBetween(today, clock.window_end);
    return n === 0 ? "Objection window closes today" : `Objection window closes in ${days(n)}`;
  }
  if ((clock.status === "accepted" || clock.status === "deemed_accepted" || clock.status === "invoiced") && clock.payment_due) {
    const n = daysBetween(today, clock.payment_due);
    if (n > 0) return `Due in ${days(n)}`;
    if (n === 0) return "Due today";
    return clock.overdue ? `Overdue ${days(-n)}` : `Due date passed ${days(-n)} ago`;
  }
  return null;
}

const FIELD_LABEL: Record<string, string> = {
  title: "the title",
  description: "the description",
  criteria: "the acceptance criteria",
  pack_md: "the acceptance pack",
  evidence: "the evidence links",
};

/** One event row as a short sentence for the timeline. */
export function describeEvent(e: Pick<AppEvent, "type" | "data">): string {
  const d = e.data;
  const text = (key: string) => String(d[key] ?? "");
  switch (e.type) {
    case "milestone_created":
      return `Created (${inr(Number(d.amount_inr))})`;
    case "submitted_for_acceptance":
      return `Submitted for acceptance, delivered ${day(text("delivered_on"))}`;
    case "client_accepted":
      return `Accepted by ${text("by")}`;
    case "objection_raised":
      return `Objection raised by ${text("by")} on ${letters((d.criteria_ids as string[]) ?? [])}${d.outside_window ? ", outside the window" : ""}`;
    case "objection_resolved":
      return `Resolved the objection on ${letters((d.criteria_ids as string[]) ?? [])}`;
    case "marked_invoiced":
      return `Marked invoiced on ${day(text("invoiced_on"))}`;
    case "marked_paid":
      return `Marked paid on ${day(text("paid_on"))}`;
    case "milestone_updated": {
      const changes = (d.changes ?? {}) as Record<string, { from: number; to: number } | true>;
      const parts = Object.entries(changes).map(([field, change]) =>
        field === "amount_inr" && change !== true
          ? `the amount from ${inr(change.from)} to ${inr(change.to)}`
          : (FIELD_LABEL[field] ?? field),
      );
      return `Changed ${andList(parts)}`;
    }
    default:
      return e.type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
  }
}

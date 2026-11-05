import type { Milestone, Objection, Workspace } from "./db/schema";

// Business rules (SPEC section 5) as pure functions. Status and dates are derived on read, never stored.
// Calendar dates are "YYYY-MM-DD" strings in Asia/Kolkata, so plain < and > compare them correctly.

const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+5:30; India has no daylight saving.

/** The Asia/Kolkata calendar date of a moment. */
export function istDate(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export const todayIST = () => istDate(new Date());

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type Status =
  | "draft"
  | "awaiting_acceptance"
  | "objection_open"
  | "accepted"
  | "deemed_accepted"
  | "invoiced"
  | "paid";

export type ClockSettings = Pick<Workspace, "objection_window_days" | "agreed_payment_days" | "written_agreement">;
export type ClockMilestone = Pick<Milestone, "delivered_on" | "client_accepted_at" | "invoiced_on" | "paid_on">;
export type ClockObjection = Pick<Objection, "resolved_at" | "outside_window">;

export interface Clock {
  status: Status;
  /** Invoiced, not paid, and today is after the payment due date. */
  overdue: boolean;
  /** The last day the client can raise an objection. */
  window_end: string | null;
  /** Set once the milestone is accepted or deemed accepted. */
  legal_acceptance_date: string | null;
  payment_due: string | null;
}

/** An objection raised after the window end is saved and flagged, but doesn't change the status. */
export const isOutsideWindow = (raisedOn: string, windowEnd: string) => raisedOn > windowEnd;

export function milestoneClock(
  m: ClockMilestone,
  objections: ClockObjection[],
  s: ClockSettings,
  today = todayIST(),
): Clock {
  const settle = (status: Status): Status => (m.paid_on ? "paid" : m.invoiced_on ? "invoiced" : status);
  if (!m.delivered_on) {
    return { status: settle("draft"), overdue: false, window_end: null, legal_acceptance_date: null, payment_due: null };
  }

  // Resolving an objection restarts the window from the resolution date (a simplification; see Prototype notes).
  const resolutions = objections.flatMap((o) => (o.resolved_at ? [istDate(o.resolved_at)] : [])).sort();
  const anchor = resolutions.at(-1) ?? m.delivered_on;
  const windowEnd = addDays(anchor, s.objection_window_days);

  let acceptance: Status;
  if (objections.some((o) => !o.resolved_at && !o.outside_window)) acceptance = "objection_open";
  else if (m.client_accepted_at && istDate(m.client_accepted_at) >= anchor) acceptance = "accepted";
  else if (today > windowEnd) acceptance = "deemed_accepted";
  else acceptance = "awaiting_acceptance";

  const legal = acceptance === "accepted" || acceptance === "deemed_accepted" ? anchor : null;
  const due = legal ? addDays(legal, s.written_agreement ? Math.min(s.agreed_payment_days, 45) : 15) : null;
  const status = settle(acceptance);
  return {
    status,
    overdue: status === "invoiced" && due !== null && today > due,
    window_end: windowEnd,
    legal_acceptance_date: legal,
    payment_due: due,
  };
}

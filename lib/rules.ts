import type { Milestone, Objection, Workspace } from "./db/schema";

// Business rules (SPEC section 5) as pure functions. Status and dates are derived on read, never stored.
// Calendar dates are "YYYY-MM-DD" strings in Asia/Kolkata, so plain < and > compare them correctly.

const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+5:30; India has no daylight saving.

/** The Asia/Kolkata calendar date of a moment. */
export function istDate(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export const todayIST = () => istDate(new Date());

/** A moment as an IST timestamp, for example "2026-11-04T16:20:00+05:30". */
export function istTimestamp(at: Date): string {
  return `${new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 19)}+05:30`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from one calendar date to another; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const STATUSES = [
  "draft",
  "awaiting_acceptance",
  "objection_open",
  "accepted",
  "deemed_accepted",
  "invoiced",
  "paid",
] as const;
export type Status = (typeof STATUSES)[number];

export type ClockSettings = Pick<Workspace, "objection_window_days" | "agreed_payment_days" | "written_agreement">;
export type ClockMilestone = Pick<Milestone, "delivered_on" | "client_accepted_at" | "invoiced_on" | "paid_on">;
export type ClockObjection = Pick<Objection, "resolved_at" | "outside_window">;

export interface Clock {
  status: Status;
  /** Invoiced, not paid, and today is after the payment due date. */
  overdue: boolean;
  /** The date the window runs from: the latest resolution, otherwise the delivery. */
  anchor_date: string | null;
  /** The last day the client can raise an objection. */
  window_end: string | null;
  /** Set once the milestone is accepted or deemed accepted. */
  legal_acceptance_date: string | null;
  payment_due: string | null;
}

/** An objection raised after the window end is saved and flagged, but doesn't change the status. */
export const isOutsideWindow = (raisedOn: string, windowEnd: string) => raisedOn > windowEnd;

/**
 * Whether the client can still accept or object on the review page. Not while an objection is open
 * (resolving it would clear the acceptance), and not once accepted, invoiced or paid.
 */
export const clientCanRespond = (status: Status) => status === "awaiting_acceptance" || status === "deemed_accepted";

export function milestoneClock(
  m: ClockMilestone,
  objections: ClockObjection[],
  s: ClockSettings,
  today = todayIST(),
): Clock {
  const settle = (status: Status): Status => (m.paid_on ? "paid" : m.invoiced_on ? "invoiced" : status);
  if (!m.delivered_on) {
    return {
      status: settle("draft"),
      overdue: false,
      anchor_date: null,
      window_end: null,
      legal_acceptance_date: null,
      payment_due: null,
    };
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
    anchor_date: anchor,
    window_end: windowEnd,
    legal_acceptance_date: legal,
    payment_due: due,
  };
}

/**
 * Why an invoice or payment date can't be recorded, or null when it can. Invoicing needs acceptance, and payment
 * needs an invoice, which may come in the same change. Dates run up to today and don't move once set.
 */
export function billingProblem(
  m: Pick<Milestone, "invoiced_on" | "paid_on">,
  acceptedOn: string | null,
  change: { invoiced_on?: string; paid_on?: string },
  today: string,
): string | null {
  if (change.invoiced_on !== undefined) {
    if (m.invoiced_on) return `This milestone was already invoiced on ${m.invoiced_on}.`;
    if (!acceptedOn) return "Only an accepted milestone can be marked invoiced.";
    if (change.invoiced_on > today) return "The invoice date can't be in the future.";
    if (change.invoiced_on < acceptedOn) return `The invoice date can't be before the acceptance date, ${acceptedOn}.`;
  }
  if (change.paid_on !== undefined) {
    if (m.paid_on) return `This milestone was already marked paid on ${m.paid_on}.`;
    const invoiced = change.invoiced_on ?? m.invoiced_on;
    if (!invoiced) return "Mark the milestone invoiced before marking it paid.";
    if (change.paid_on > today) return "The payment date can't be in the future.";
    if (change.paid_on < invoiced) return `The payment date can't be before the invoice date, ${invoiced}.`;
  }
  return null;
}

/**
 * What get_pipeline_summary reports (SPEC section 7): totals by status, objection windows closing in the next 7 days,
 * open objections, deemed acceptances whose window closed in the last 14 days, and payments due within 30 days or past due.
 */
export function pipeline<T extends { milestone: Pick<Milestone, "amount_inr">; clock: Clock }>(rows: T[], today: string) {
  const within = (date: string | null, from: number, to: number) =>
    date !== null && daysBetween(today, date) >= from && daysBetween(today, date) <= to;
  const by = (key: "window_end" | "payment_due") => (a: T, b: T) => String(a.clock[key]).localeCompare(String(b.clock[key]));
  const totals = Object.fromEntries(
    STATUSES.map((status) => {
      const of = rows.filter((r) => r.clock.status === status);
      return [status, { count: of.length, total_inr: of.reduce((sum, r) => sum + r.milestone.amount_inr, 0) }];
    }),
  ) as Record<Status, { count: number; total_inr: number }>;
  const owed: Status[] = ["accepted", "deemed_accepted", "invoiced"];
  return {
    totals,
    closingSoon: rows
      .filter((r) => r.clock.status === "awaiting_acceptance" && within(r.clock.window_end, 0, 7))
      .sort(by("window_end")),
    objectionsOpen: rows.filter((r) => r.clock.status === "objection_open"),
    recentlyDeemed: rows.filter((r) => r.clock.status === "deemed_accepted" && within(r.clock.window_end, -14, -1)),
    paymentsDue: rows
      .filter((r) => owed.includes(r.clock.status) && within(r.clock.payment_due, -Infinity, 30))
      .sort(by("payment_due")),
  };
}

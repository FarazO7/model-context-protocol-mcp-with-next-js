import { describe, expect, it } from "vitest";
import {
  addDays,
  billingProblem,
  clientCanRespond,
  daysBetween,
  isOutsideWindow,
  isRepeatObjection,
  istDate,
  istTimestamp,
  milestoneClock,
  pipeline,
  signedNameMatches,
  type Clock,
  type ClockMilestone,
  type ClockObjection,
  type Status,
} from "./rules";

const settings = { objection_window_days: 15, agreed_payment_days: 30, written_agreement: true };
const ist = (date: string, time = "11:00") => new Date(`${date}T${time}:00+05:30`);
const delivered = (on: string | null, more: Partial<ClockMilestone> = {}): ClockMilestone => ({
  delivered_on: on,
  client_accepted_at: null,
  invoiced_on: null,
  paid_on: null,
  ...more,
});
const objection = (more: Partial<ClockObjection> = {}): ClockObjection => ({ resolved_at: null, outside_window: false, ...more });
const resolvedOn = (date: string) => objection({ resolved_at: ist(date, "15:00") });

describe("istDate", () => {
  it("is still the 5th at 23:59 IST", () => expect(istDate(new Date("2026-11-05T18:29:59Z"))).toBe("2026-11-05"));
  it("turns to the 6th at midnight IST", () => expect(istDate(new Date("2026-11-05T18:30:00Z"))).toBe("2026-11-06"));
});

it("istTimestamp shows India time with its offset", () =>
  expect(istTimestamp(new Date("2026-11-04T10:50:00Z"))).toBe("2026-11-04T16:20:00+05:30"));

describe("addDays", () => {
  it("crosses a month end", () => expect(addDays("2026-11-25", 10)).toBe("2026-12-05"));
  it("crosses a year end", () => expect(addDays("2026-12-31", 1)).toBe("2027-01-01"));
  it("goes backwards", () => expect(addDays("2026-03-01", -1)).toBe("2026-02-28"));
});

describe("daysBetween", () => {
  it("counts forwards across a month end", () => expect(daysBetween("2026-11-25", "2026-12-05")).toBe(10));
  it("is negative backwards", () => expect(daysBetween("2026-11-06", "2026-11-01")).toBe(-5));
  it("is zero on the same day", () => expect(daysBetween("2026-11-06", "2026-11-06")).toBe(0));
});

describe("milestoneClock: the seven tests from SPEC section 5", () => {
  it("1. delivered 1 Nov, no action, today 17 Nov: deemed accepted from 1 Nov, due 1 Dec", () => {
    expect(milestoneClock(delivered("2026-11-01"), [], settings, "2026-11-17")).toEqual({
      status: "deemed_accepted",
      overdue: false,
      anchor_date: "2026-11-01",
      window_end: "2026-11-16",
      legal_acceptance_date: "2026-11-01",
      payment_due: "2026-12-01",
    });
  });

  it("2. delivered 1 Nov, client accepts 5 Nov: accepted, legal date 1 Nov, due 1 Dec", () => {
    const m = delivered("2026-11-01", { client_accepted_at: ist("2026-11-05") });
    expect(milestoneClock(m, [], settings, "2026-11-05")).toMatchObject({
      status: "accepted",
      legal_acceptance_date: "2026-11-01",
      payment_due: "2026-12-01",
    });
  });

  it("3. objection 10 Nov resolved 14 Nov, client accepts 15 Nov: legal date 14 Nov, due 14 Dec", () => {
    const m = delivered("2026-11-01", { client_accepted_at: ist("2026-11-15") });
    expect(milestoneClock(m, [resolvedOn("2026-11-14")], settings, "2026-11-15")).toMatchObject({
      status: "accepted",
      legal_acceptance_date: "2026-11-14",
      payment_due: "2026-12-14",
    });
  });

  it("4. agreed payment days of 60 are capped at 45", () => {
    const clock = milestoneClock(delivered("2026-11-01"), [], { ...settings, agreed_payment_days: 60 }, "2026-11-17");
    expect(clock.payment_due).toBe("2026-12-16");
  });

  it("5. no written agreement: due 15 days after the legal date", () => {
    const clock = milestoneClock(delivered("2026-11-01"), [], { ...settings, written_agreement: false }, "2026-11-17");
    expect(clock.payment_due).toBe("2026-11-16");
  });

  it("6. objection raised 17 Nov on a 1 Nov delivery: flagged outside the window, status unchanged", () => {
    const before = milestoneClock(delivered("2026-11-01"), [], settings, "2026-11-17");
    expect(before.window_end).toBe("2026-11-16");
    expect(isOutsideWindow("2026-11-17", "2026-11-16")).toBe(true);
    expect(isOutsideWindow("2026-11-16", "2026-11-16")).toBe(false);
    const after = milestoneClock(delivered("2026-11-01"), [objection({ outside_window: true })], settings, "2026-11-17");
    expect(after).toEqual(before);
  });

  it("7. invoiced, today past due, not paid: invoiced and overdue", () => {
    const m = delivered("2026-11-01", { client_accepted_at: ist("2026-11-05"), invoiced_on: "2026-11-06" });
    expect(milestoneClock(m, [], settings, "2026-12-02")).toMatchObject({
      status: "invoiced",
      overdue: true,
      payment_due: "2026-12-01",
    });
  });
});

describe("milestoneClock: edge cases", () => {
  it("the last day of the window is still awaiting acceptance", () => {
    expect(milestoneClock(delivered("2026-11-01"), [], settings, "2026-11-16")).toEqual({
      status: "awaiting_acceptance",
      overdue: false,
      anchor_date: "2026-11-01",
      window_end: "2026-11-16",
      legal_acceptance_date: null,
      payment_due: null,
    });
  });

  it("an acceptance on the delivery day counts", () => {
    const m = delivered("2026-10-02", { client_accepted_at: ist("2026-10-02", "17:30") });
    expect(milestoneClock(m, [], settings, "2026-10-02")).toMatchObject({
      status: "accepted",
      legal_acceptance_date: "2026-10-02",
      payment_due: "2026-11-01",
    });
  });

  it("an open objection beats deemed acceptance, even after the window end", () => {
    expect(milestoneClock(delivered("2026-11-01"), [objection()], settings, "2026-11-30").status).toBe("objection_open");
  });

  it("an acceptance from before the latest resolution doesn't count, and the window restarts", () => {
    const m = delivered("2026-11-01", { client_accepted_at: ist("2026-11-05") });
    expect(milestoneClock(m, [resolvedOn("2026-11-14")], settings, "2026-11-20")).toMatchObject({
      status: "awaiting_acceptance",
      anchor_date: "2026-11-14",
      window_end: "2026-11-29",
      legal_acceptance_date: null,
    });
  });

  it("anchors on the IST date of a resolution just after midnight", () => {
    const lateNight = objection({ resolved_at: new Date("2026-11-13T19:00:00Z") }); // 00:30 IST on 14 Nov
    expect(milestoneClock(delivered("2026-11-01"), [lateNight], settings, "2026-11-20").window_end).toBe("2026-11-29");
  });

  it("invoiced on the due date itself is not overdue", () => {
    const m = delivered("2026-11-01", { client_accepted_at: ist("2026-11-05"), invoiced_on: "2026-11-06" });
    expect(milestoneClock(m, [], settings, "2026-12-01")).toMatchObject({ status: "invoiced", overdue: false });
  });

  it("paid stays paid past the due date", () => {
    const m = delivered("2026-11-01", { invoiced_on: "2026-11-20", paid_on: "2026-12-20" });
    expect(milestoneClock(m, [], settings, "2026-12-25")).toMatchObject({
      status: "paid",
      overdue: false,
      payment_due: "2026-12-01",
    });
  });

  it("no delivery is a draft with no dates", () => {
    expect(milestoneClock(delivered(null), [], settings, "2026-11-20")).toEqual({
      status: "draft",
      overdue: false,
      anchor_date: null,
      window_end: null,
      legal_acceptance_date: null,
      payment_due: null,
    });
  });
});

it("lets the client respond only while awaiting acceptance or deemed accepted", () => {
  expect(clientCanRespond("awaiting_acceptance")).toBe(true);
  expect(clientCanRespond("deemed_accepted")).toBe(true);
  for (const status of ["draft", "objection_open", "accepted", "invoiced", "paid"] as const) {
    expect(clientCanRespond(status)).toBe(false);
  }
});

describe("billingProblem", () => {
  const unbilled = { invoiced_on: null, paid_on: null };
  const today = "2026-11-06";
  it("allows an invoice from the acceptance date to today, and a payment with it", () => {
    expect(billingProblem(unbilled, "2026-11-01", { invoiced_on: "2026-11-01" }, today)).toBeNull();
    expect(billingProblem(unbilled, "2026-11-01", { invoiced_on: "2026-11-02", paid_on: "2026-11-06" }, today)).toBeNull();
  });
  it("needs acceptance before an invoice", () =>
    expect(billingProblem(unbilled, null, { invoiced_on: today }, today)).toBe("Only an accepted milestone can be marked invoiced."));
  it("refuses future dates and dates out of order", () => {
    expect(billingProblem(unbilled, "2026-11-01", { invoiced_on: "2026-11-07" }, today)).toBe("The invoice date can't be in the future.");
    expect(billingProblem(unbilled, "2026-11-01", { invoiced_on: "2026-10-31" }, today)).toBe(
      "The invoice date can't be before the acceptance date, 2026-11-01.",
    );
    const invoiced = { invoiced_on: "2026-11-03", paid_on: null };
    expect(billingProblem(invoiced, "2026-11-01", { paid_on: "2026-11-07" }, today)).toBe("The payment date can't be in the future.");
    expect(billingProblem(invoiced, "2026-11-01", { paid_on: "2026-11-02" }, today)).toBe(
      "The payment date can't be before the invoice date, 2026-11-03.",
    );
  });
  it("needs an invoice before a payment", () =>
    expect(billingProblem(unbilled, "2026-11-01", { paid_on: today }, today)).toBe("Mark the milestone invoiced before marking it paid."));
  it("doesn't move a date once set", () => {
    const paid = { invoiced_on: "2026-11-03", paid_on: "2026-11-05" };
    expect(billingProblem(paid, "2026-11-01", { invoiced_on: today }, today)).toBe("This milestone was already invoiced on 2026-11-03.");
    expect(billingProblem(paid, "2026-11-01", { paid_on: today }, today)).toBe("This milestone was already marked paid on 2026-11-05.");
  });
  it("has nothing to check when neither date changes", () => expect(billingProblem(unbilled, null, {}, today)).toBeNull());
});

describe("pipeline", () => {
  const today = "2026-11-06";
  const row = (name: string, status: Status, amount_inr: number, dates: Partial<Clock> = {}) => ({
    name,
    milestone: { amount_inr },
    clock: { status, overdue: false, anchor_date: null, window_end: null, legal_acceptance_date: null, payment_due: null, ...dates },
  });
  const names = (rows: { name: string }[]) => rows.map((r) => r.name);
  const rows = [
    row("closes in 7", "awaiting_acceptance", 100, { window_end: "2026-11-13" }),
    row("closes in 8", "awaiting_acceptance", 200, { window_end: "2026-11-14" }),
    row("closes today", "awaiting_acceptance", 300, { window_end: "2026-11-06" }),
    row("objection", "objection_open", 400, { window_end: "2026-11-20" }),
    row("deemed 14 days ago", "deemed_accepted", 500, { window_end: "2026-10-23", payment_due: "2026-12-07" }),
    row("deemed 15 days ago", "deemed_accepted", 600, { window_end: "2026-10-22", payment_due: "2026-12-06" }),
    row("overdue", "invoiced", 700, { payment_due: "2026-11-01", overdue: true }),
    row("paid", "paid", 800, { payment_due: "2026-10-01" }),
  ];
  const p = pipeline(rows, today);

  it("totals every status, including empty ones", () => {
    expect(p.totals.awaiting_acceptance).toEqual({ count: 3, total_inr: 600 });
    expect(p.totals.deemed_accepted).toEqual({ count: 2, total_inr: 1100 });
    expect(p.totals.draft).toEqual({ count: 0, total_inr: 0 });
  });
  it("lists windows closing in the next 7 days, soonest first", () =>
    expect(names(p.closingSoon)).toEqual(["closes today", "closes in 7"]));
  it("lists open objections", () => expect(names(p.objectionsOpen)).toEqual(["objection"]));
  it("lists deemed acceptances whose window closed in the last 14 days", () =>
    expect(names(p.recentlyDeemed)).toEqual(["deemed 14 days ago"]));
  it("lists payments due within 30 days or past due, soonest first", () =>
    expect(names(p.paymentsDue)).toEqual(["overdue", "deemed 15 days ago"]));
});

describe("signedNameMatches", () => {
  it("matches regardless of case, spacing and Unicode form", () => {
    expect(signedNameMatches("Meera Iyer", "Meera Iyer")).toBe(true);
    expect(signedNameMatches("meera iyer ", "Meera Iyer")).toBe(true);
    expect(signedNameMatches("  Meera   Iyer", "Meera Iyer")).toBe(true);
    expect(signedNameMatches("Me\u0301era", "M\u00e9era")).toBe(true);
  });
  it("flags a different name or script", () => {
    expect(signedNameMatches("Mira", "Meera Iyer")).toBe(false);
    expect(signedNameMatches("मीरा अय्यर", "Meera Iyer")).toBe(false);
    expect(signedNameMatches("Ananya Sen", "Dr Ananya Sen")).toBe(false);
  });
});

describe("isRepeatObjection", () => {
  const raised_at = new Date("2026-11-06T04:30:00Z");
  const earlier = [{ raised_by: "Mira", note: "Badge missing.", criteria_ids: ["b", "e"], raised_at }];
  const same = { raised_by: "Mira", note: "Badge missing.", criteria_ids: ["e", "b"] };
  it("treats the same objection within two minutes as a repeat", () =>
    expect(isRepeatObjection(earlier, same, new Date("2026-11-06T04:31:59Z"))).toBe(true));
  it("lets a different note or criteria through", () => {
    expect(isRepeatObjection(earlier, { ...same, note: "Hours cut off." }, new Date("2026-11-06T04:31:00Z"))).toBe(false);
    expect(isRepeatObjection(earlier, { ...same, criteria_ids: ["b"] }, new Date("2026-11-06T04:31:00Z"))).toBe(false);
  });
  it("lets the same objection through after two minutes", () =>
    expect(isRepeatObjection(earlier, same, new Date("2026-11-06T04:32:00Z"))).toBe(false));
});

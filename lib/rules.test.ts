import { describe, expect, it } from "vitest";
import { addDays, isOutsideWindow, istDate, milestoneClock, type ClockMilestone, type ClockObjection } from "./rules";

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

describe("addDays", () => {
  it("crosses a month end", () => expect(addDays("2026-11-25", 10)).toBe("2026-12-05"));
  it("crosses a year end", () => expect(addDays("2026-12-31", 1)).toBe("2027-01-01"));
  it("goes backwards", () => expect(addDays("2026-03-01", -1)).toBe("2026-02-28"));
});

describe("milestoneClock: the seven tests from SPEC section 5", () => {
  it("1. delivered 1 Nov, no action, today 17 Nov: deemed accepted from 1 Nov, due 1 Dec", () => {
    expect(milestoneClock(delivered("2026-11-01"), [], settings, "2026-11-17")).toEqual({
      status: "deemed_accepted",
      overdue: false,
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
      window_end: null,
      legal_acceptance_date: null,
      payment_due: null,
    });
  });
});

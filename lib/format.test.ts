import { describe, expect, it } from "vitest";
import { chip, day, dateTime, describeEvent, inr } from "./format";
import type { Clock } from "./rules";

const clock = (c: Partial<Clock>): Clock => ({
  status: "awaiting_acceptance",
  overdue: false,
  anchor_date: null,
  window_end: null,
  legal_acceptance_date: null,
  payment_due: null,
  ...c,
});

it("formats rupees the Indian way", () => expect(inr(450000)).toBe("₹4,50,000"));
it("formats dates and IST times", () => {
  expect(day("2026-11-16")).toBe("16 Nov 2026");
  expect(dateTime(new Date("2026-11-04T10:50:00Z"))).toBe("4 Nov 2026, 16:20");
});

describe("chip", () => {
  const today = "2026-11-06";
  it("counts down the objection window", () => {
    expect(chip(clock({ window_end: "2026-11-18" }), today)).toBe("Objection window closes in 12 days");
    expect(chip(clock({ window_end: "2026-11-06" }), today)).toBe("Objection window closes today");
  });
  it("counts down to payment", () => {
    expect(chip(clock({ status: "deemed_accepted", payment_due: "2026-11-16" }), today)).toBe("Due in 10 days");
    expect(chip(clock({ status: "accepted", payment_due: "2026-11-07" }), today)).toBe("Due in 1 day");
    expect(chip(clock({ status: "invoiced", payment_due: "2026-11-06" }), today)).toBe("Due today");
  });
  it("says overdue only when invoiced", () => {
    expect(chip(clock({ status: "invoiced", overdue: true, payment_due: "2026-11-01" }), today)).toBe("Overdue 5 days");
    expect(chip(clock({ status: "accepted", payment_due: "2026-11-04" }), today)).toBe("Due date passed 2 days ago");
  });
  it("shows nothing for drafts, objections and paid", () => {
    for (const status of ["draft", "objection_open", "paid"] as const) expect(chip(clock({ status }), today)).toBeNull();
  });
});

it("describes events in plain sentences", () => {
  expect(
    describeEvent({ type: "milestone_updated", data: { changes: { amount_inr: { from: 480000, to: 500000 }, criteria: true } } }),
  ).toBe("Changed the amount from ₹4,80,000 to ₹5,00,000 and the acceptance criteria");
  expect(describeEvent({ type: "objection_raised", data: { by: "Meera Iyer", criteria_ids: ["b", "e"] } })).toBe(
    "Objection raised by Meera Iyer on (b) and (e)",
  );
});

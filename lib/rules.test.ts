import { describe, expect, it } from "vitest";
import { addDays, todayIST } from "./rules";

describe("todayIST", () => {
  it("is still the 5th at 23:59 IST", () => expect(todayIST(new Date("2026-11-05T18:29:59Z"))).toBe("2026-11-05"));
  it("turns to the 6th at midnight IST", () => expect(todayIST(new Date("2026-11-05T18:30:00Z"))).toBe("2026-11-06"));
});

describe("addDays", () => {
  it("crosses a month end", () => expect(addDays("2026-11-25", 10)).toBe("2026-12-05"));
  it("crosses a year end", () => expect(addDays("2026-12-31", 1)).toBe("2027-01-01"));
  it("goes backwards", () => expect(addDays("2026-03-01", -1)).toBe("2026-02-28"));
});

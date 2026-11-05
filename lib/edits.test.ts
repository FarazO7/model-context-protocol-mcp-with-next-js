import { describe, expect, it } from "vitest";
import { parseEvidence, reviseCriteria, withoutNumber } from "./edits";

const abc = [
  { id: "a", text: "First" },
  { id: "b", text: "Second" },
  { id: "c", text: "Third" },
];
const revise = (op: string, texts: Record<string, string> = {}, add = "") => reviseCriteria(abc, { texts, add, op });

describe("withoutNumber", () => {
  it("strips M1. and Milestone 2:", () => {
    expect(withoutNumber("M1. Discovery and UX design")).toBe("Discovery and UX design");
    expect(withoutNumber("Milestone 2: Store finder")).toBe("Store finder");
    expect(withoutNumber("M3 Loyalty wallet")).toBe("Loyalty wallet");
  });
  it("leaves real titles alone", () => {
    expect(withoutNumber("MVP launch")).toBe("MVP launch");
    expect(withoutNumber("M2M integration")).toBe("M2M integration");
    expect(withoutNumber("Milestone 1")).toBe("Milestone 1");
  });
});

describe("reviseCriteria", () => {
  it("edits text and keeps letters", () => {
    expect(revise("save", { b: " Second, tightened " })).toEqual({
      ok: [{ id: "a", text: "First" }, { id: "b", text: "Second, tightened" }, { id: "c", text: "Third" }],
    });
  });
  it("moves up and down without re-lettering", () => {
    expect(revise("up:c")).toEqual({ ok: [abc[0], abc[2], abc[1]] });
    expect(revise("down:a")).toEqual({ ok: [abc[1], abc[0], abc[2]] });
    expect(revise("up:a")).toEqual({ ok: abc });
  });
  it("removes and adds with the next letter", () => {
    expect(revise("remove:b")).toEqual({ ok: [abc[0], abc[2]] });
    expect(revise("save", {}, "Fourth")).toEqual({ ok: [...abc, { id: "d", text: "Fourth" }] });
    expect(revise("remove:c", {}, "New")).toEqual({ ok: [abc[0], abc[1], { id: "d", text: "New" }] });
  });
  it("refuses empty criteria and an empty list", () => {
    expect(revise("save", { b: "  " })).toEqual({ error: "Criterion (b) is empty. Write it or remove it." });
    expect(reviseCriteria([abc[0]], { texts: {}, add: "", op: "remove:a" })).toEqual({
      error: "Keep at least one acceptance criterion.",
    });
  });
});

describe("parseEvidence", () => {
  it("reads labelled and bare links", () => {
    expect(parseEvidence("Staging build | https://example.com/a\n\nhttps://example.com/b")).toEqual({
      ok: [
        { label: "Staging build", url: "https://example.com/a" },
        { label: "https://example.com/b", url: "https://example.com/b" },
      ],
    });
  });
  it("refuses javascript: and plain text", () => {
    expect(parseEvidence("Bad | javascript:alert(1)")).toEqual({ error: "Line 1 of the evidence needs a link starting with https://." });
    expect(parseEvidence("x\nnot a link")).toEqual({ error: "Line 1 of the evidence needs a link starting with https://." });
  });
});

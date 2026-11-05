import { describe, expect, it } from "vitest";
import { parseEvidence, replaceCriteria, reviseCriteria, withoutNumber } from "./edits";

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

describe("replaceCriteria", () => {
  it("edits, reorders and removes by letter", () => {
    expect(replaceCriteria(abc, [{ id: "c", text: "Third, tightened" }, { id: "a", text: "First" }])).toEqual({
      ok: [{ id: "c", text: "Third, tightened" }, abc[0]],
    });
  });
  it("gives new criteria the next letters, even after a removal in the same list", () => {
    expect(replaceCriteria(abc, [abc[0], { text: "New" }, { text: "Newer" }])).toEqual({
      ok: [abc[0], { id: "d", text: "New" }, { id: "e", text: "Newer" }],
    });
  });
  it("refuses unknown and repeated letters", () => {
    expect(replaceCriteria(abc, [{ id: "x", text: "?" }])).toEqual({
      error: "There is no criterion (x) on this milestone. Leave id out to add a new criterion.",
    });
    expect(replaceCriteria(abc, [abc[0], { id: "a", text: "Again" }])).toEqual({
      error: "Criterion (a) is in the list twice. List each letter once.",
    });
  });
  it("stops after (z)", () => {
    expect(replaceCriteria([{ id: "z", text: "Last" }], [{ text: "One more" }])).toEqual({
      error: "A milestone can have at most 26 criteria.",
    });
  });
});

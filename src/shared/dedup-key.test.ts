// src/shared/dedup-key.test.ts
// ---------------------------------------------------------------------------
// Tests for computeDedupKey — content-based job deduplication hash.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { computeDedupKey } from "./dedup-key";

describe("computeDedupKey", () => {
  it("produces same hash for identical inputs", () => {
    const a = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "indeed");
    const b = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "indeed");
    expect(a).toBe(b);
  });

  it("produces different hashes for different companies", () => {
    const a = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "indeed");
    const b = computeDedupKey("Beta Inc", "Software Engineer", "Brussels", "indeed");
    expect(a).not.toBe(b);
  });

  it("produces different hashes for different titles", () => {
    const a = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "indeed");
    const b = computeDedupKey("Acme Corp", "Product Manager", "Brussels", "indeed");
    expect(a).not.toBe(b);
  });

  it("is case-insensitive for company and title", () => {
    const a = computeDedupKey("ACME CORP", "SOFTWARE ENGINEER", "Brussels", "indeed");
    const b = computeDedupKey("acme corp", "software engineer", "Brussels", "indeed");
    expect(a).toBe(b);
  });

  it("trims whitespace from inputs", () => {
    const a = computeDedupKey("  Acme Corp  ", " Software Engineer ", " Brussels ", "indeed");
    const b = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "indeed");
    expect(a).toBe(b);
  });

  it("different source → different key (same posting across sites = separate rows)", () => {
    const a = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "indeed");
    const b = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "linkedin");
    expect(a).not.toBe(b);
  });

  it("empty location produces consistent key", () => {
    const a = computeDedupKey("Acme Corp", "Software Engineer", "", "indeed");
    const b = computeDedupKey("Acme Corp", "Software Engineer", "", "indeed");
    expect(a).toBe(b);
  });

  it("different location produces different key", () => {
    const a = computeDedupKey("Acme Corp", "Software Engineer", "Brussels", "indeed");
    const b = computeDedupKey("Acme Corp", "Software Engineer", "Paris", "indeed");
    expect(a).not.toBe(b);
  });
});

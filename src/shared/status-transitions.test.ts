// shared/status-transitions.test.ts
// ---------------------------------------------------------------------------
// Tests for status transition validation logic.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  isTransitionValid,
  getAllowedTransitions,
  isTerminal,
  isActive,
} from "./status-transitions";

describe("isTransitionValid", () => {
  it("allows any transition from '--' (no status)", () => {
    expect(isTransitionValid("--", "Saved")).toBe(true);
    expect(isTransitionValid("--", "Applied 📤")).toBe(true);
    expect(isTransitionValid("--", "Interview 🤝")).toBe(true);
    expect(isTransitionValid("--", "Offer 🎉")).toBe(true);
    expect(isTransitionValid("--", "Rejected ❌")).toBe(true);
    expect(isTransitionValid("--", "Archived")).toBe(true);
  });

  it("allows any transition from 'Saved'", () => {
    expect(isTransitionValid("Saved", "--")).toBe(true);
    expect(isTransitionValid("Saved", "Applied 📤")).toBe(true);
    expect(isTransitionValid("Saved", "Interview 🤝")).toBe(true);
    expect(isTransitionValid("Saved", "Archived")).toBe(true);
  });

  it("prevents backward transitions from 'Applied 📤'", () => {
    expect(isTransitionValid("Applied 📤", "--")).toBe(false);
    expect(isTransitionValid("Applied 📤", "Saved")).toBe(false);
  });

  it("allows forward transitions from 'Applied 📤'", () => {
    expect(isTransitionValid("Applied 📤", "Interview 🤝")).toBe(true);
    expect(isTransitionValid("Applied 📤", "Rejected ❌")).toBe(true);
    expect(isTransitionValid("Applied 📤", "Archived")).toBe(true);
  });

  it("prevents backward transitions from 'Interview 🤝'", () => {
    expect(isTransitionValid("Interview 🤝", "--")).toBe(false);
    expect(isTransitionValid("Interview 🤝", "Saved")).toBe(false);
    expect(isTransitionValid("Interview 🤝", "Applied 📤")).toBe(false);
  });

  it("allows forward transitions from 'Interview 🤝'", () => {
    expect(isTransitionValid("Interview 🤝", "Offer 🎉")).toBe(true);
    expect(isTransitionValid("Interview 🤝", "Rejected ❌")).toBe(true);
    expect(isTransitionValid("Interview 🤝", "Archived")).toBe(true);
  });

  it("only allows 'Archived' from terminal 'Offer 🎉'", () => {
    expect(isTransitionValid("Offer 🎉", "--")).toBe(false);
    expect(isTransitionValid("Offer 🎉", "Saved")).toBe(false);
    expect(isTransitionValid("Offer 🎉", "Applied 📤")).toBe(false);
    expect(isTransitionValid("Offer 🎉", "Interview 🤝")).toBe(false);
    expect(isTransitionValid("Offer 🎉", "Rejected ❌")).toBe(false);
    expect(isTransitionValid("Offer 🎉", "Archived")).toBe(true);
  });

  it("only allows 'Archived' from terminal 'Rejected ❌'", () => {
    expect(isTransitionValid("Rejected ❌", "--")).toBe(false);
    expect(isTransitionValid("Rejected ❌", "Saved")).toBe(false);
    expect(isTransitionValid("Rejected ❌", "Applied 📤")).toBe(false);
    expect(isTransitionValid("Rejected ❌", "Interview 🤝")).toBe(false);
    expect(isTransitionValid("Rejected ❌", "Offer 🎉")).toBe(false);
    expect(isTransitionValid("Rejected ❌", "Archived")).toBe(true);
  });

  it("allows any transition from 'Archived' (un-archive)", () => {
    expect(isTransitionValid("Archived", "--")).toBe(true);
    expect(isTransitionValid("Archived", "Saved")).toBe(true);
    expect(isTransitionValid("Archived", "Applied 📤")).toBe(true);
    expect(isTransitionValid("Archived", "Interview 🤝")).toBe(true);
    expect(isTransitionValid("Archived", "Offer 🎉")).toBe(true);
    expect(isTransitionValid("Archived", "Rejected ❌")).toBe(true);
    expect(isTransitionValid("Archived", "Closed 🔒")).toBe(true);
  });

  it("allows un-close and archive from 'Closed 🔒'", () => {
    expect(isTransitionValid("Closed 🔒", "--")).toBe(true);
    expect(isTransitionValid("Closed 🔒", "Archived")).toBe(true);
  });

  it("prevents transitions from 'Closed 🔒' to non-allowed statuses", () => {
    expect(isTransitionValid("Closed 🔒", "Saved")).toBe(false);
    expect(isTransitionValid("Closed 🔒", "Applied 📤")).toBe(false);
    expect(isTransitionValid("Closed 🔒", "Interview 🤝")).toBe(false);
    expect(isTransitionValid("Closed 🔒", "Offer 🎉")).toBe(false);
    expect(isTransitionValid("Closed 🔒", "Rejected ❌")).toBe(false);
  });

  it("prevents user from manually setting 'Closed 🔒' (system-only)", () => {
    expect(isTransitionValid("--", "Closed 🔒")).toBe(false);
    expect(isTransitionValid("Saved", "Closed 🔒")).toBe(false);
    expect(isTransitionValid("Applied 📤", "Closed 🔒")).toBe(false);
    expect(isTransitionValid("Interview 🤝", "Closed 🔒")).toBe(false);
    expect(isTransitionValid("Offer 🎉", "Closed 🔒")).toBe(false);
    expect(isTransitionValid("Rejected ❌", "Closed 🔒")).toBe(false);
  });

  it("returns false for same-status transitions", () => {
    expect(isTransitionValid("--", "--")).toBe(false);
    expect(isTransitionValid("Applied 📤", "Applied 📤")).toBe(false);
    expect(isTransitionValid("Offer 🎉", "Offer 🎉")).toBe(false);
    expect(isTransitionValid("Closed 🔒", "Closed 🔒")).toBe(false);
  });
});

describe("getAllowedTransitions", () => {
  it("returns all statuses for '--'", () => {
    const allowed = getAllowedTransitions("--");
    expect(allowed).toContain("Saved");
    expect(allowed).toContain("Applied 📤");
    expect(allowed).toContain("Interview 🤝");
    expect(allowed).toContain("Offer 🎉");
    expect(allowed).toContain("Rejected ❌");
    expect(allowed).toContain("Archived");
    // Should not include '--' itself
    expect(allowed).not.toContain("--");
    expect(allowed).toHaveLength(6);
  });

  it("returns forward-only options for 'Applied 📤'", () => {
    const allowed = getAllowedTransitions("Applied 📤");
    expect(allowed).toContain("Interview 🤝");
    expect(allowed).toContain("Rejected ❌");
    expect(allowed).toContain("Archived");
    expect(allowed).not.toContain("--");
    expect(allowed).not.toContain("Saved");
    expect(allowed).toHaveLength(3);
  });

  it("returns only 'Archived' for 'Offer 🎉'", () => {
    const allowed = getAllowedTransitions("Offer 🎉");
    expect(allowed).toEqual(["Archived"]);
  });

  it("returns all statuses for 'Archived' (un-archive)", () => {
    const allowed = getAllowedTransitions("Archived");
    expect(allowed).toContain("--");
    expect(allowed).toContain("Saved");
    expect(allowed).toContain("Applied 📤");
    expect(allowed).toContain("Closed 🔒");
    expect(allowed).toHaveLength(7);
  });

  it("returns un-close and archive for 'Closed 🔒'", () => {
    const allowed = getAllowedTransitions("Closed 🔒");
    expect(allowed).toContain("--");
    expect(allowed).toContain("Archived");
    expect(allowed).toHaveLength(2);
  });
});

describe("isTerminal", () => {
  it("returns true for 'Offer 🎉'", () => {
    expect(isTerminal("Offer 🎉")).toBe(true);
  });

  it("returns true for 'Rejected ❌'", () => {
    expect(isTerminal("Rejected ❌")).toBe(true);
  });

  it("returns false for non-terminal statuses", () => {
    expect(isTerminal("--")).toBe(false);
    expect(isTerminal("Saved")).toBe(false);
    expect(isTerminal("Applied 📤")).toBe(false);
    expect(isTerminal("Interview 🤝")).toBe(false);
    expect(isTerminal("Archived")).toBe(false);
    expect(isTerminal("Closed 🔒")).toBe(false);
  });
});

describe("isActive", () => {
  it("returns true for pipeline statuses", () => {
    expect(isActive("--")).toBe(true);
    expect(isActive("Saved")).toBe(true);
    expect(isActive("Applied 📤")).toBe(true);
    expect(isActive("Interview 🤝")).toBe(true);
  });

  it("returns false for non-pipeline statuses", () => {
    expect(isActive("Offer 🎉")).toBe(false);
    expect(isActive("Rejected ❌")).toBe(false);
    expect(isActive("Archived")).toBe(false);
    expect(isActive("Closed 🔒")).toBe(false);
  });
});

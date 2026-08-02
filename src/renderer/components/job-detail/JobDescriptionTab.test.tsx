// src/renderer/components/job-detail/JobDescriptionTab.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for cleanLinkedInMarkup — LinkedIn job description formatting.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { cleanLinkedInMarkup } from "./JobDescriptionTab";

describe("cleanLinkedInMarkup", () => {
  it("strips a single ** line with no closing pair", () => {
    expect(cleanLinkedInMarkup("** About the role\nSome description text")).toBe(
      "About the role\nSome description text",
    );
  });

  it("strips a single _ line with no closing pair", () => {
    expect(cleanLinkedInMarkup("_ About the role\nSome description text")).toBe(
      "About the role\nSome description text",
    );
  });

  it("preserves ** that has a closing pair on the same line (real bold)", () => {
    expect(cleanLinkedInMarkup("**Bold text** and more")).toBe("**Bold text** and more");
  });

  it("converts two consecutive ** lines to ## headers", () => {
    const input = "**About the job\n**Join our team";
    const output = cleanLinkedInMarkup(input);
    expect(output).toBe("## About the job\n## Join our team");
  });

  it("converts three consecutive ** lines to ## headers", () => {
    const input = "**Responsibilities\n**Requirements\n**Benefits";
    const output = cleanLinkedInMarkup(input);
    expect(output).toBe("## Responsibilities\n## Requirements\n## Benefits");
  });

  it("converts consecutive ** lines while leaving non-** lines unchanged", () => {
    const input = "Some intro text\n**Section One\n**Section Two\nRegular text here";
    const output = cleanLinkedInMarkup(input);
    expect(output).toBe("Some intro text\n## Section One\n## Section Two\nRegular text here");
  });

  it("handles ** lines with trailing whitespace", () => {
    const input = "**  About the job  \n**  Join our team  ";
    const output = cleanLinkedInMarkup(input);
    expect(output).toBe("## About the job\n## Join our team");
  });

  it("handles empty lines between non-consecutive ** lines", () => {
    const input = "**Standalone header\n\nSome paragraph text";
    const output = cleanLinkedInMarkup(input);
    expect(output).toBe("Standalone header\n\nSome paragraph text");
  });
});

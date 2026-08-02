// src/renderer/components/editors/SkillListEditor.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for SkillListEditor — structured skill editor with name + category.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { SkillListEditor } from "./SkillListEditor";
import type { Skill } from "../../../shared/state";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

function renderComponent(skills: Skill[] = [], onChange = vi.fn()) {
  return render(
    <MantineProvider>
      <SkillListEditor skills={skills} onChange={onChange} />
    </MantineProvider>,
  );
}

const sampleSkills: Skill[] = [
  { name: "TypeScript", category: "technical" },
  { name: "Leadership", category: "soft" },
];

describe("SkillListEditor", () => {
  it("renders existing skills with name and category select", () => {
    renderComponent(sampleSkills);

    expect(screen.getByDisplayValue("TypeScript")).toBeDefined();
    expect(screen.getByDisplayValue("Leadership")).toBeDefined();
  });

  it("shows empty state when no skills", () => {
    renderComponent([]);
    expect(screen.getByText(/no skills/i)).toBeDefined();
  });

  it("adds a new skill row when Add Skill is clicked", () => {
    const onChange = vi.fn();
    renderComponent(sampleSkills, onChange);

    fireEvent.click(screen.getByText(/Add Skill/i));

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[0][0] as Skill[];
    expect(updated).toHaveLength(3);
    expect(updated[2].name).toBe("");
    expect(updated[2].category).toBe("technical");
  });

  it("removes a skill row when remove button is clicked", () => {
    const onChange = vi.fn();
    renderComponent(
      [
        { name: "TypeScript", category: "technical" },
        { name: "React", category: "technical" },
      ],
      onChange,
    );

    const removeButtons = screen.getAllByLabelText("Remove skill");
    fireEvent.click(removeButtons[0]);

    const updated = onChange.mock.calls[0][0] as Skill[];
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("React");
  });

  it("calls onChange when skill name is edited", () => {
    const onChange = vi.fn();
    renderComponent(sampleSkills, onChange);

    fireEvent.change(screen.getByDisplayValue("TypeScript"), {
      target: { value: "TypeScript 5" },
    });

    const updated = onChange.mock.calls[0][0] as Skill[];
    expect(updated[0].name).toBe("TypeScript 5");
    expect(updated[0].category).toBe("technical");
  });
});

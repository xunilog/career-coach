// src/renderer/components/editors/ProfileSectionDisplay.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ProfileSectionDisplay — reusable section card with content,
// placeholder fallback, and edit button.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ProfileSectionDisplay } from "./ProfileSectionDisplay";

// ── jsdom polyfills ────────────────────────────────────────────────────────

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

  Object.defineProperty(document, "fonts", {
    writable: true,
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderSection(props: {
  title?: string;
  children?: React.ReactNode;
  placeholder?: string;
  onEdit?: () => void;
}) {
  return render(
    <MantineProvider>
      <ProfileSectionDisplay
        title={props.title ?? "Test Section"}
        placeholder={props.placeholder ?? "No data yet."}
        onEdit={props.onEdit ?? vi.fn()}
      >
        {props.children}
      </ProfileSectionDisplay>
    </MantineProvider>,
  );
}

describe("ProfileSectionDisplay", () => {
  it("renders the section title", () => {
    renderSection({ title: "Career Drivers" });
    expect(screen.getByText("Career Drivers")).toBeDefined();
  });

  it("renders content when provided", () => {
    renderSection({ children: <span>Some content here</span> });
    expect(screen.getByText("Some content here")).toBeDefined();
  });

  it("renders placeholder when content is empty", () => {
    renderSection({ children: null, placeholder: "Nothing to show" });
    expect(screen.getByText("Nothing to show")).toBeDefined();
  });

  it("renders placeholder when content is empty string", () => {
    renderSection({ children: "", placeholder: "Empty string fallback" });
    expect(screen.getByText("Empty string fallback")).toBeDefined();
  });

  it("renders an edit button with aria-label", () => {
    renderSection({ title: "Colors Profile" });
    const editBtn = screen.getByLabelText("Edit Colors Profile");
    expect(editBtn).toBeDefined();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    renderSection({ title: "Values", onEdit });
    const editBtn = screen.getByLabelText("Edit Values");
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

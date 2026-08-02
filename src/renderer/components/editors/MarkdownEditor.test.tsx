// src/renderer/components/editors/MarkdownEditor.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for MarkdownEditor — verifies markdown is parsed into rich text,
// not displayed as raw markdown characters (#, **, etc.).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MarkdownEditor } from "./MarkdownEditor";

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

  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Wrapper ────────────────────────────────────────────────────────────────

function renderMarkdownEditor(content: string, onChange = vi.fn(), height?: number | string) {
  return render(
    <MantineProvider>
      <MarkdownEditor content={content} onChange={onChange} height={height} />
    </MantineProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("MarkdownEditor", () => {
  it("renders markdown as formatted rich text, not raw markdown characters", () => {
    const markdown = "# Hello World\n\nThis is **bold** and *italic* text.";
    const { container } = renderMarkdownEditor(markdown);
    const textContent = container.textContent ?? "";
    expect(textContent).not.toContain("# Hello World");
    expect(textContent).not.toContain("**");
    expect(textContent).not.toContain("*italic*");
  });

  it("renders headings from markdown # syntax", () => {
    const markdown = "# Heading One\n\n## Heading Two";
    const { container } = renderMarkdownEditor(markdown);
    const h1 = container.querySelector("h1");
    const h2 = container.querySelector("h2");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toContain("Heading One");
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toContain("Heading Two");
  });

  it("renders bold from markdown ** syntax", () => {
    const markdown = "Some **bold content** here.";
    const { container } = renderMarkdownEditor(markdown);
    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("bold content");
  });

  it("renders bullet lists from markdown - syntax", () => {
    const markdown = "- First item\n- Second item";
    const { container } = renderMarkdownEditor(markdown);
    const textContent = container.textContent ?? "";
    expect(textContent).not.toContain("- First");
    expect(textContent).not.toContain("- Second");
    const ul = container.querySelector("ul");
    expect(ul).not.toBeNull();
  });

  it("renders a full profile-style markdown without raw syntax", () => {
    const markdown = `# Career Profile

## Colors Profile
- **Dominant Color:** 🔴 Red
- **Secondary Color:** 🔵 Blue
- **DISC Profile:** D/C

## Career Drivers
- autonomy
- impact
- expertise

## Risk Appetite
medium

Open to calculated risks in tech startups, but prefers stability in core income.`;
    const { container } = renderMarkdownEditor(markdown);
    const textContent = container.textContent ?? "";
    expect(textContent).not.toContain("## ");
    expect(textContent).not.toContain("**");
    expect(textContent).not.toContain("- **");
    expect(textContent).not.toContain("# Career Profile");
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    const h2 = container.querySelector("h2");
    expect(h2).not.toBeNull();
  });

  describe("height prop", () => {
    it("renders ProseMirror editor when height is provided", () => {
      const { container } = renderMarkdownEditor("Some content", vi.fn(), "500px");

      const proseMirror = container.querySelector(".ProseMirror");
      expect(proseMirror).not.toBeNull();
    });

    it("wraps Content in a flex child with minHeight: 0", () => {
      const { container } = renderMarkdownEditor("Some content", vi.fn(), "500px");

      // The wrapper div around Content enables ResizeObserver height measurement
      const proseMirror = container.querySelector(".ProseMirror");
      const wrapper = proseMirror?.closest<HTMLElement>("[style*='min-height: 0']");
      expect(wrapper).not.toBeNull();
    });
  });
});

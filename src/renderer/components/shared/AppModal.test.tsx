// @vitest-environment jsdom
// src/renderer/components/shared/AppModal.test.tsx
// ---------------------------------------------------------------------------
// Tests for AppModal — sticky header/footer with scrollable content.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider, Button } from "@mantine/core";
import { AppModal } from "./AppModal";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });

  global.ResizeObserver = vi.fn(function ResizeObserver(_callback: ResizeObserverCallback) {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  }) as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

function renderWithProvider(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("AppModal", () => {
  it("renders title, content, and footer", () => {
    renderWithProvider(
      <AppModal opened={true} onClose={() => {}} title="Test Modal" footer={<Button>Save</Button>}>
        <p>Modal content</p>
      </AppModal>,
    );

    expect(screen.getByText("Test Modal")).toBeDefined();
    expect(screen.getByText("Modal content")).toBeDefined();
    expect(screen.getByText("Save")).toBeDefined();
  });

  it("modal content section is a flex column with max-height constraint", () => {
    renderWithProvider(
      <AppModal
        opened={true}
        onClose={() => {}}
        title="Constraint Test"
        footer={<Button>Footer</Button>}
      >
        <div>content</div>
      </AppModal>,
    );

    const contentSection = document.querySelector(".mantine-Modal-content") as HTMLElement;
    expect(contentSection).toBeTruthy();

    const style = window.getComputedStyle(contentSection);
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
    // Must have a max-height to constrain the modal within the viewport
    expect(style.maxHeight).not.toBe("none");
  });

  it("modal body is a flex column with overflow hidden", () => {
    renderWithProvider(
      <AppModal opened={true} onClose={() => {}} title="Body Test" footer={<Button>Footer</Button>}>
        <div>content</div>
      </AppModal>,
    );

    const body = document.querySelector(".mantine-Modal-body") as HTMLElement;
    expect(body).toBeTruthy();

    const style = window.getComputedStyle(body);
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
    expect(style.overflow).toBe("hidden");
    // Body takes remaining space after header
    const flexGrow = parseFloat(style.flexGrow);
    expect(flexGrow).toBeGreaterThan(0);
  });

  it("scrollable wrapper has overflow-y: auto and min-height: 0", () => {
    renderWithProvider(
      <AppModal
        opened={true}
        onClose={() => {}}
        title="Scroll Test"
        footer={<Button>Footer</Button>}
      >
        <div style={{ height: 2000 }}>Tall content</div>
      </AppModal>,
    );

    const content = screen.getByText("Tall content");
    const scrollableArea = content.parentElement!;

    const style = window.getComputedStyle(scrollableArea);
    expect(style.overflowY).toBe("auto");
    expect(style.minHeight).toBe("0px");
  });

  it("footer is outside the scrollable area", () => {
    renderWithProvider(
      <AppModal
        opened={true}
        onClose={() => {}}
        title="Footer Test"
        footer={<Button>Footer Button</Button>}
      >
        <p>Content</p>
      </AppModal>,
    );

    const footer = screen.getByText("Footer Button");
    const scrollableArea = screen.getByText("Content").parentElement!;

    expect(scrollableArea.contains(footer)).toBe(false);
  });

  it("scrollable area survives re-renders without DOM replacement", () => {
    const { rerender } = renderWithProvider(
      <AppModal
        opened={true}
        onClose={() => {}}
        title="Stable Test"
        footer={<Button>Footer</Button>}
      >
        <div style={{ height: 2000 }}>Tall content</div>
      </AppModal>,
    );

    const contentNode = screen.getByText("Tall content");
    const scrollableArea = contentNode.parentElement!;

    // Re-render with a different title to trigger React reconciliation
    rerender(
      <MantineProvider>
        <AppModal
          opened={true}
          onClose={() => {}}
          title="Updated Title"
          footer={<Button>Footer</Button>}
        >
          <div style={{ height: 2000 }}>Tall content</div>
        </AppModal>
      </MantineProvider>,
    );

    // The content text must still be in the DOM
    const contentAfter = screen.getByText("Tall content");
    expect(contentAfter).toBeDefined();

    // The scrollable wrapper should be the same DOM node (not replaced)
    const scrollableAfter = contentAfter.parentElement!;
    expect(scrollableAfter).toBe(scrollableArea);
  });

  it("does not render footer when not provided", () => {
    renderWithProvider(
      <AppModal opened={true} onClose={() => {}} title="No Footer">
        <p>Just content</p>
      </AppModal>,
    );

    expect(screen.getByText("Just content")).toBeDefined();
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.queryByText("Cancel")).toBeNull();
  });
});

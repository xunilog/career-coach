// src/renderer/components/job-detail/ExportToolbar.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ExportToolbar — button states, context-awareness, callbacks.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ExportToolbar } from "./ExportToolbar";

// ── jsdom polyfill ─────────────────────────────────────────────────────────

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

function renderWithProvider(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("ExportToolbar", () => {
  it('"Export PDF" is disabled when no document exists', () => {
    renderWithProvider(
      <ExportToolbar
        documentType="resume"
        hasDocument={false}
        hasApplyUrl={true}
        onExportPdf={vi.fn()}
        onCopy={vi.fn()}
        onOpenUrl={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const exportBtn = buttons.find((b) => b.textContent?.includes("Export"));
    expect(exportBtn).toBeDefined();
    expect((exportBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('"Export PDF" is enabled when document exists', () => {
    renderWithProvider(
      <ExportToolbar
        documentType="resume"
        hasDocument={true}
        hasApplyUrl={true}
        onExportPdf={vi.fn()}
        onCopy={vi.fn()}
        onOpenUrl={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const exportBtn = buttons.find((b) => b.textContent?.includes("Export"));
    expect(exportBtn).toBeDefined();
    expect((exportBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('"Copy" calls onCopy callback', () => {
    const onCopy = vi.fn();
    renderWithProvider(
      <ExportToolbar
        documentType="cover"
        hasDocument={true}
        hasApplyUrl={true}
        onExportPdf={vi.fn()}
        onCopy={onCopy}
        onOpenUrl={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const copyBtn = buttons.find((b) => b.textContent?.includes("Copy"));
    expect(copyBtn).toBeDefined();
    copyBtn?.click();
    expect(onCopy).toHaveBeenCalled();
  });

  it('"Open Apply URL" is disabled when no URL', () => {
    renderWithProvider(
      <ExportToolbar
        documentType="resume"
        hasDocument={true}
        hasApplyUrl={false}
        onExportPdf={vi.fn()}
        onCopy={vi.fn()}
        onOpenUrl={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const urlBtn = buttons.find((b) => b.textContent?.includes("Apply"));
    expect(urlBtn).toBeDefined();
    expect((urlBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('"Open Apply URL" is enabled when URL exists', () => {
    const onOpenUrl = vi.fn();
    renderWithProvider(
      <ExportToolbar
        documentType="cover"
        hasDocument={true}
        hasApplyUrl={true}
        onExportPdf={vi.fn()}
        onCopy={vi.fn()}
        onOpenUrl={onOpenUrl}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const urlBtn = buttons.find((b) => b.textContent?.includes("Apply"));
    expect(urlBtn).toBeDefined();
    expect((urlBtn as HTMLButtonElement).disabled).toBe(false);
    urlBtn?.click();
    expect(onOpenUrl).toHaveBeenCalled();
  });

  it("triggers onExportPdf when Export PDF clicked", () => {
    const onExportPdf = vi.fn();
    renderWithProvider(
      <ExportToolbar
        documentType="cover"
        hasDocument={true}
        hasApplyUrl={true}
        onExportPdf={onExportPdf}
        onCopy={vi.fn()}
        onOpenUrl={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const exportBtn = buttons.find((b) => b.textContent?.includes("Export"));
    exportBtn?.click();
    expect(onExportPdf).toHaveBeenCalled();
  });
});

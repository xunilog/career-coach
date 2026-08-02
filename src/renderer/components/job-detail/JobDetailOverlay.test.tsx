// src/renderer/components/job-detail/JobDetailOverlay.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for JobDetailOverlay — absolute-positioned wrapper for JobDetailView.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

// ── Mock JobDetailView to verify props forwarding ───────────────────────────

const mockJobDetailView = vi.fn();
vi.mock("./JobDetailView", () => ({
  JobDetailView: (props: { jobId: string; searchId: string; onClose?: () => void }) => {
    mockJobDetailView(props);
    return <div data-testid="job-detail-view">{props.jobId}</div>;
  },
}));

// ── Polyfills ────────────────────────────────────────────────────────────────

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
  vi.clearAllMocks();
});

// Dynamic import after mocks
const { JobDetailOverlay } = await import("./JobDetailOverlay");

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderOverlay(props: { jobId: string; searchId: string; onClose: () => void }) {
  return render(
    <MantineProvider>
      <div style={{ position: "relative", height: 400 }}>
        <JobDetailOverlay {...props} />
      </div>
    </MantineProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("JobDetailOverlay", () => {
  it("renders the overlay container", () => {
    const onClose = vi.fn();
    renderOverlay({ jobId: "j1", searchId: "s1", onClose });

    expect(screen.getByTestId("job-detail-overlay")).toBeDefined();
  });

  it("passes props through to JobDetailView", () => {
    const onClose = vi.fn();
    renderOverlay({ jobId: "j1", searchId: "s1", onClose });

    expect(mockJobDetailView).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "j1", searchId: "s1", onClose }),
    );
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    renderOverlay({ jobId: "j1", searchId: "s1", onClose });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose for non-Escape keys", () => {
    const onClose = vi.fn();
    renderOverlay({ jobId: "j1", searchId: "s1", onClose });

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

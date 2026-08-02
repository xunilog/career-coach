// src/renderer/components/job-detail/JobDetailView.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for JobDetailView — prop-based job detail with tabs and chat.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

// ── Mock Tauri APIs ─────────────────────────────────────────────────────────

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
}));

// ── Mock Mantine hooks ──────────────────────────────────────────────────────

vi.mock("@mantine/hooks", () => ({
  useViewportSize: () => ({ height: 800, width: 1200 }),
  useElementSize: () => ({ ref: vi.fn(), height: 48, width: 1200 }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

// ── Mock @tanstack/react-query ──────────────────────────────────────────────

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
}));

// ── Mock hooks ───────────────────────────────────────────────────────────────

vi.mock("../../hooks/useJobQueries", () => ({
  useJobDetailQuery: vi.fn(),
  useMarkSeen: () => ({ mutate: vi.fn() }),
}));

vi.mock("../../hooks/useSearchQueries", () => ({
  useSearch: vi.fn(),
}));

vi.mock("../../hooks/useResearchQueries", () => ({
  useResearchQuery: () => ({ data: null }),
}));

vi.mock("../../hooks/useStatusQueries", () => ({
  useUpdateStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateNotes: () => ({ mutate: vi.fn() }),
  useStatusHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../hooks/useGenerationQueries", () => ({
  useResumeQuery: () => ({ data: null }),
  useCoverLetterQuery: () => ({ data: null }),
  resumeKey: () => ["resume"],
  coverKey: () => ["cover"],
}));

// ── Mock stores ──────────────────────────────────────────────────────────────

vi.mock("../../stores/layoutStore", () => ({
  useLayoutStore: (selector: (state: unknown) => unknown) => selector({ appHeaderHeight: 56 }),
}));

vi.mock("../../stores/careerStore", () => ({
  useCareerStore: (selector: (state: unknown) => unknown) =>
    selector({ setJobContext: vi.fn(), documentUpdatedAt: 0 }),
}));

// ── Mock child components ────────────────────────────────────────────────────

vi.mock("./JobDescriptionTab", () => ({
  JobDescriptionTab: () => <div data-testid="job-description-tab" />,
}));

vi.mock("./ResearchTab", () => ({
  ResearchTab: () => <div data-testid="research-tab" />,
}));

vi.mock("./ResumeTab", () => ({
  ResumeTab: () => <div data-testid="resume-tab" />,
}));

vi.mock("./CoverLetterTab", () => ({
  CoverLetterTab: () => <div data-testid="cover-letter-tab" />,
}));

vi.mock("./StatusDropdown", () => ({
  StatusDropdown: () => <div data-testid="status-dropdown" />,
}));

vi.mock("./StatusHistoryPanel", () => ({
  StatusHistoryPanel: () => <div data-testid="status-history-panel" />,
}));

vi.mock("./ExportToolbar", () => ({
  ExportToolbar: () => <div data-testid="export-toolbar" />,
}));

vi.mock("../chat/CoachChatPanel", () => ({
  CoachChatPanel: () => <div data-testid="coach-chat-panel" />,
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
const { useJobDetailQuery } = await import("../../hooks/useJobQueries");
const { useSearch } = await import("../../hooks/useSearchQueries");
const { JobDetailView } = await import("./JobDetailView");

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderView(props: { jobId: string; searchId: string; onClose?: () => void }) {
  return render(
    <MantineProvider>
      <JobDetailView {...props} />
    </MantineProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("JobDetailView", () => {
  describe("Loading state", () => {
    it("shows loader when job is loading", () => {
      (useJobDetailQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      (useSearch as ReturnType<typeof vi.fn>).mockReturnValue({ data: null });

      renderView({ jobId: "j1", searchId: "s1" });

      expect(document.querySelector(".mantine-Loader-root")).toBeTruthy();
    });
  });

  describe("Error / not found state", () => {
    it("shows 'Job Not Found' and back button calls onClose", () => {
      (useJobDetailQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      (useSearch as ReturnType<typeof vi.fn>).mockReturnValue({ data: null });
      const onClose = vi.fn();

      renderView({ jobId: "bad-id", searchId: "s1", onClose });

      expect(screen.getByText("Job Not Found")).toBeDefined();

      fireEvent.click(screen.getByText("← Back"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Rendered job detail", () => {
    const mockJob = {
      id: "j1",
      title: "Senior Engineer",
      company: "Acme Corp",
      location: "Paris",
      salary: "€80k",
      fit: "High",
      description: "A great job.",
      notes: null,
      source: "indeed",
      status: "--",
      applyUrl: "https://example.com",
    };

    beforeEach(() => {
      (useJobDetailQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockJob,
        isLoading: false,
      });
      (useSearch as ReturnType<typeof vi.fn>).mockReturnValue({
        data: { id: "s1", title: "My Search" },
      });
    });

    it("renders job title from props", () => {
      renderView({ jobId: "j1", searchId: "s1" });
      expect(screen.getByText("Senior Engineer")).toBeDefined();
    });

    it("renders company and location", () => {
      renderView({ jobId: "j1", searchId: "s1" });
      expect(screen.getByText("Acme Corp")).toBeDefined();
      expect(screen.getByText(/Paris/)).toBeDefined();
    });

    it("renders fit badge", () => {
      renderView({ jobId: "j1", searchId: "s1" });
      expect(screen.getByText("High")).toBeDefined();
    });

    it("calls onClose when back button clicked", () => {
      const onClose = vi.fn();
      renderView({ jobId: "j1", searchId: "s1", onClose });

      // Back button has title "Back to results"
      const backBtn = document.querySelector('[title="Back to results"]');
      expect(backBtn).toBeTruthy();
      fireEvent.click(backBtn!);
      expect(onClose).toHaveBeenCalled();
    });

    it("renders child components", () => {
      renderView({ jobId: "j1", searchId: "s1" });

      expect(screen.getByTestId("job-description-tab")).toBeDefined();
      expect(screen.getByTestId("status-dropdown")).toBeDefined();
      expect(screen.getByTestId("export-toolbar")).toBeDefined();
      expect(screen.getByTestId("status-history-panel")).toBeDefined();
      expect(screen.getByTestId("coach-chat-panel")).toBeDefined();
    });
  });
});

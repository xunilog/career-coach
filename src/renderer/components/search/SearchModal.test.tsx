// @vitest-environment jsdom
// src/renderer/components/search/SearchModal.test.tsx
// ---------------------------------------------------------------------------
// Tests for SearchModal — create/edit/delete search form.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockDeleteMutate, mockCloseModal, mockSetActiveSearchId } = vi.hoisted(() => ({
  mockDeleteMutate: vi.fn(),
  mockCloseModal: vi.fn(),
  mockSetActiveSearchId: vi.fn(),
}));

// ── Mock Tauri dialog plugin ─────────────────────────────────────────────────

vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: vi.fn().mockResolvedValue(true),
}));

// ── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock("../../hooks/useSearchQueries", () => ({
  useSearch: () => ({
    data: {
      id: "srch-test-123",
      title: "VP Growth",
      location: "United States",
      schedule: "manual" as const,
      createdAt: "2024-01-01T00:00:00.000Z",
      lastRunAt: null,
      filters: {},
    },
  }),
  useCreateSearch: () => ({ mutateAsync: vi.fn() }),
  useUpdateSearch: () => ({ mutateAsync: vi.fn() }),
  useDeleteSearch: () => ({ mutateAsync: mockDeleteMutate }),
  useCheckDuplicate: () => ({ mutateAsync: vi.fn() }),
}));

// ── Mock store ─────────────────────────────────────────────────────────────

const mockStoreState = {
  isModalOpen: true,
  modalMode: "edit" as "edit" | "create",
  editingSearchId: "srch-test-123" as string | null,
  closeModal: mockCloseModal,
  setActiveSearchId: mockSetActiveSearchId,
};

const mockStoreFn = vi.fn((selector?: (state: typeof mockStoreState) => unknown) => {
  return selector ? selector(mockStoreState) : mockStoreState;
}) as unknown as ReturnType<typeof vi.fn> & { getState: () => typeof mockStoreState };
mockStoreFn.getState = () => mockStoreState;

vi.mock("../../stores/jobSearchStore", () => ({
  useJobSearchStore: mockStoreFn,
}));

// ── Polyfills ──────────────────────────────────────────────────────────────

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

  global.ResizeObserver = vi.fn(function ResizeObserver() {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }) as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Dynamic import after mocks ─────────────────────────────────────────────

const { SearchModal } = await import("./SearchModal");

// ── Helpers ────────────────────────────────────────────────────────────────

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <SearchModal />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function setCreateMode() {
  mockStoreState.isModalOpen = true;
  mockStoreState.modalMode = "create";
  mockStoreState.editingSearchId = null;
}

function setEditMode() {
  mockStoreState.isModalOpen = true;
  mockStoreState.modalMode = "edit";
  mockStoreState.editingSearchId = "srch-test-123";
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SearchModal - text input", () => {
  it("allows typing in the Job Title field in create mode", () => {
    setCreateMode();
    renderModal();

    const titleInput = screen.getByRole("textbox", { name: "Job Title" });
    expect(titleInput).toBeDefined();

    fireEvent.change(titleInput, { target: { value: "VP Growth" } });
    expect((titleInput as HTMLInputElement).value).toBe("VP Growth");
  });

  it("allows typing in the Location field in create mode", () => {
    setCreateMode();
    renderModal();

    const locationInput = screen.getByRole("textbox", { name: "Location" });
    expect(locationInput).toBeDefined();

    fireEvent.change(locationInput, { target: { value: "United States" } });
    expect((locationInput as HTMLInputElement).value).toBe("United States");
  });

  it("enables the Save button only when both title and location are filled", () => {
    setCreateMode();
    renderModal();

    const saveBtn = screen.getByRole("button", { name: "Save" });
    expect(saveBtn).toBeDefined();
    expect(saveBtn.hasAttribute("disabled")).toBe(true);

    const titleInput = screen.getByRole("textbox", { name: "Job Title" });
    const locationInput = screen.getByRole("textbox", { name: "Location" });

    fireEvent.change(titleInput, { target: { value: "VP Growth" } });
    expect(saveBtn.hasAttribute("disabled")).toBe(true);

    fireEvent.change(locationInput, { target: { value: "United States" } });
    expect(saveBtn.hasAttribute("disabled")).toBe(false);
  });
});

describe("SearchModal - delete", () => {
  it("shows delete button in edit mode and deletes on confirm", async () => {
    setEditMode();
    mockDeleteMutate.mockResolvedValue({ deleted: true });
    const { ask } = await import("@tauri-apps/plugin-dialog");

    renderModal();

    // Delete button should be visible in edit mode with outline variant
    const deleteBtn = screen.getByRole("button", { name: "Delete Search" });
    expect(deleteBtn).toBeDefined();
    expect(deleteBtn.getAttribute("data-variant")).toBe("outline");

    // Click delete button
    fireEvent.click(deleteBtn);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(ask).toHaveBeenCalledWith("Delete this search and all its job postings?", {
        title: "Delete Search",
        kind: "warning",
      });
    });

    // Delete mutation should be called with the correct ID
    expect(mockDeleteMutate).toHaveBeenCalledWith("srch-test-123");

    // Modal should close and navigate to inbox after delete
    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });
});

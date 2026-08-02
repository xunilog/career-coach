// src/renderer/components/layout/ApiKeyModal.test.tsx
/**
 * @vitest-environment jsdom
 */
// ---------------------------------------------------------------------------
// Tests for ApiKeyModal — modal for updating the Anthropic API key
// from the header settings menu.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { ApiKeyModal } from "./ApiKeyModal";

// ── jsdom polyfills ────────────────────────────────────────────────────

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

const mockVerifyAndStoreKey = vi.fn();

vi.mock("../../../shared/api-key-manager", () => ({
  verifyAndStoreKey: (...args: unknown[]) => mockVerifyAndStoreKey(...args),
  clearCache: vi.fn(),
  hasKey: vi.fn().mockResolvedValue(true),
}));

function renderModal(open = true) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const result = render(
    <MantineProvider>
      <QueryClientProvider client={qc}>
        <ApiKeyModal opened={open} onClose={onClose} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  return { ...result, onClose, qc };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ApiKeyModal", () => {
  it("renders the modal with API key input", async () => {
    renderModal();

    expect(await screen.findByText("Anthropic API Key")).toBeDefined();
    expect(screen.getByPlaceholderText("sk-ant-api...")).toBeDefined();
    expect(screen.getByRole("button", { name: /verify & save/i })).toBeDefined();
  });

  it("does not render when closed", () => {
    renderModal(false);
    expect(screen.queryByText("Anthropic API Key")).toBeNull();
  });

  it("calls verifyAndStoreKey on submit", async () => {
    mockVerifyAndStoreKey.mockResolvedValue(undefined);
    const { onClose } = renderModal();

    const input = await screen.findByPlaceholderText("sk-ant-api...");
    fireEvent.change(input, { target: { value: "sk-ant-new-key" } });
    fireEvent.click(screen.getByRole("button", { name: /verify & save/i }));

    // Wait for the mutation to complete
    await screen.findByText("Anthropic API Key"); // re-render after mutation

    expect(mockVerifyAndStoreKey).toHaveBeenCalledWith("anthropic", "sk-ant-new-key");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error on invalid key", async () => {
    mockVerifyAndStoreKey.mockRejectedValue(
      new Error("Invalid API key. Please check your key and try again."),
    );

    renderModal();

    const input = await screen.findByPlaceholderText("sk-ant-api...");
    fireEvent.change(input, { target: { value: "bad-key" } });
    fireEvent.click(screen.getByRole("button", { name: /verify & save/i }));

    await screen.findByText(/invalid API key/i);

    // Modal should stay open, button still available
    expect(screen.getByRole("button", { name: /verify & save/i })).toBeDefined();
  });
});

// src/renderer/components/layout/ApiKeyGate.test.tsx
/**
 * @vitest-environment jsdom
 */
// ---------------------------------------------------------------------------
// Tests for ApiKeyGate — full-screen page blocking app access until
// a valid Anthropic API key is provided and verified.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { ApiKeyGate } from "./ApiKeyGate";

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

// Mock the ApiKeyManager module so we control verification behavior
const mockHasKey = vi.fn();
const mockVerifyAndStoreKey = vi.fn();

vi.mock("../../../shared/api-key-manager", () => ({
  hasKey: (...args: unknown[]) => mockHasKey(...args),
  verifyAndStoreKey: (...args: unknown[]) => mockVerifyAndStoreKey(...args),
  clearCache: vi.fn(),
}));

function renderGate() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onKeyReady = vi.fn();
  const result = render(
    <MantineProvider>
      <QueryClientProvider client={qc}>
        <ApiKeyGate onKeyReady={onKeyReady} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  return { ...result, onKeyReady, qc };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ApiKeyGate", () => {
  it("renders the gate title and input field", async () => {
    mockHasKey.mockResolvedValue(false);
    renderGate();

    // Use findBy which is async and waits
    expect(await screen.findByText("Enter Anthropic API Key")).toBeDefined();
    expect(screen.getByPlaceholderText("sk-ant-api...")).toBeDefined();
    expect(screen.getByRole("button", { name: "Verify & Continue" })).toBeDefined();
  });

  it("shows a loading spinner while checking initial key status", () => {
    // hasKey not yet resolved — should show loader, not the form
    mockHasKey.mockReturnValue(new Promise(() => {})); // never resolves
    renderGate();

    // Spinner should be visible
    expect(screen.getByText(/checking configuration/i)).toBeDefined();
  });

  it("calls verifyAndStoreKey on submit with a valid key", async () => {
    mockHasKey.mockResolvedValue(false);
    mockVerifyAndStoreKey.mockResolvedValue(undefined);

    const { onKeyReady } = renderGate();

    const button = await screen.findByRole("button", { name: "Verify & Continue" });

    const input = screen.getByPlaceholderText("sk-ant-api...");
    fireEvent.change(input, { target: { value: "sk-ant-valid-key-123" } });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockVerifyAndStoreKey).toHaveBeenCalledWith("anthropic", "sk-ant-valid-key-123");
      expect(onKeyReady).toHaveBeenCalled();
    });
  });

  it("shows error message on invalid key (401)", async () => {
    mockHasKey.mockResolvedValue(false);
    mockVerifyAndStoreKey.mockRejectedValue(
      new Error("Invalid API key. Please check your key and try again."),
    );

    renderGate();

    const button = await screen.findByRole("button", { name: "Verify & Continue" });

    const input = screen.getByPlaceholderText("sk-ant-api...");
    fireEvent.change(input, { target: { value: "bad-key" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/invalid API key/i)).toBeDefined();
    });

    // Button should still be present to try again
    expect(screen.getByRole("button", { name: "Verify & Continue" })).toBeDefined();
  });

  it("shows error with retry button on network error", async () => {
    mockHasKey.mockResolvedValue(false);
    mockVerifyAndStoreKey.mockRejectedValue(
      new Error("Unable to reach Anthropic. Check your internet connection and try again."),
    );

    renderGate();

    const button = await screen.findByRole("button", { name: "Verify & Continue" });

    const input = screen.getByPlaceholderText("sk-ant-api...");
    fireEvent.change(input, { target: { value: "sk-ant-key" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/unable to reach anthropic/i)).toBeDefined();
    });

    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeDefined();

    // Clicking retry should call verification again
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(mockVerifyAndStoreKey).toHaveBeenCalledTimes(2);
    });
  });

  it("shows verifying spinner during verification", async () => {
    mockHasKey.mockResolvedValue(false);
    // Never-resolving promise so we can observe pending state
    mockVerifyAndStoreKey.mockReturnValue(new Promise(() => {}));

    renderGate();

    const button = await screen.findByRole("button", { name: "Verify & Continue" });

    const input = screen.getByPlaceholderText("sk-ant-api...");
    fireEvent.change(input, { target: { value: "sk-ant-key" } });
    fireEvent.click(button);

    // During verification, the form is replaced by a full-screen spinner
    await waitFor(() => {
      expect(screen.getByText(/verifying your api key/i)).toBeDefined();
    });
  });
});

// src/renderer/components/chat/ChatInput.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ChatInput — auto-sizing textarea for chat messages.
// Replaces single-line TextInput with wrapping Mantine Textarea+autosize.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ChatInput } from "./ChatInput";

// ── jsdom polyfills ──────────────────────────────────────────────────

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

  // Mantine Autosize uses document.fonts.addEventListener
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

function renderChatInput(props: {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onSend?: (text: string) => void;
  onChange?: (value: string) => void;
}) {
  const onSend = props.onSend ?? vi.fn();
  const onChange = props.onChange ?? vi.fn();
  return render(
    <MantineProvider>
      <ChatInput
        value={props.value ?? ""}
        placeholder={props.placeholder ?? "Type a message..."}
        disabled={props.disabled ?? false}
        onChange={onChange}
        onSend={onSend}
      />
    </MantineProvider>,
  );
}

describe("ChatInput", () => {
  it("renders a textarea (not a single-line input)", () => {
    renderChatInput({});
    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
  });

  it("renders with the given placeholder", () => {
    renderChatInput({ placeholder: "Ask the coach..." });
    expect(screen.getByPlaceholderText("Ask the coach...")).toBeDefined();
  });

  it("calls onSend with trimmed value on Enter (without Shift)", () => {
    const onSend = vi.fn();
    renderChatInput({ value: "hello coach", onSend });

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledWith("hello coach");
  });

  it("does NOT call onSend on Shift+Enter", () => {
    const onSend = vi.fn();
    renderChatInput({ value: "line1", onSend });

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("does NOT call onSend when value is empty or whitespace-only", () => {
    const onSend = vi.fn();
    renderChatInput({ value: "   ", onSend });

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the textarea when disabled prop is true", () => {
    renderChatInput({ disabled: true });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });
});

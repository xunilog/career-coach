// src/renderer/hooks/useScrollToBottom.test.ts
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for useScrollToBottom — auto-scroll chat to bottom using Mantine
// useScrollIntoView hook. No longer uses IntersectionObserver; always
// scrolls when autoScrollDeps change.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Mock requestAnimationFrame to fire synchronously in tests ────────

let rafId = 0;

vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(Date.now());
  return ++rafId;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

// ── Mock useScrollIntoView to return a spy ──────────────────────────

const mockScrollIntoViewFn = vi.fn();
const mockTargetRef = { current: null };

vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual("@mantine/hooks");
  return {
    ...(actual as object),
    useScrollIntoView: () => ({
      scrollIntoView: mockScrollIntoViewFn,
      targetRef: mockTargetRef,
      scrollableRef: { current: null },
      cancel: vi.fn(),
      scrolling: false,
    }),
  };
});

// ── Import after mocks ────────────────────────────────────────────────

import { useScrollToBottom } from "./useScrollToBottom";

// ── Tests ─────────────────────────────────────────────────────────────

describe("useScrollToBottom", () => {
  afterEach(() => {
    mockScrollIntoViewFn.mockClear();
  });

  it("returns scrollToBottom function, bottomRef, and scrollableRef", () => {
    const { result } = renderHook(() => useScrollToBottom());

    expect(result.current).toHaveProperty("scrollToBottom");
    expect(result.current).toHaveProperty("bottomRef");
    expect(result.current).toHaveProperty("scrollableRef");
    expect(typeof result.current.scrollToBottom).toBe("function");
    expect(result.current.bottomRef).toBe(mockTargetRef);
    expect(result.current.scrollableRef).toHaveProperty("current");
  });

  it("calls scrollIntoView when scrollToBottom is invoked explicitly", () => {
    const { result } = renderHook(() => useScrollToBottom());

    act(() => {
      result.current.scrollToBottom();
    });

    expect(mockScrollIntoViewFn).toHaveBeenCalled();
  });

  it("auto-scrolls when deps change", () => {
    mockScrollIntoViewFn.mockClear();

    const { rerender } = renderHook(({ deps }) => useScrollToBottom({ autoScrollDeps: deps }), {
      initialProps: { deps: [1] },
    });

    // Clear the auto-scroll call from initial mount
    mockScrollIntoViewFn.mockClear();

    rerender({ deps: [2] });

    expect(mockScrollIntoViewFn).toHaveBeenCalled();
  });

  it("auto-scrolls even when user has scrolled up (no longer gated on scroll position)", () => {
    mockScrollIntoViewFn.mockClear();

    const { rerender } = renderHook(({ deps }) => useScrollToBottom({ autoScrollDeps: deps }), {
      initialProps: { deps: [1] },
    });

    mockScrollIntoViewFn.mockClear();

    // Change deps → should always trigger scrollIntoView
    rerender({ deps: [2] });

    expect(mockScrollIntoViewFn).toHaveBeenCalled();
  });

  it("auto-scrolls after deps change when wrapping arrays (real usage pattern)", () => {
    mockScrollIntoViewFn.mockClear();

    const messagesA = ["msg-1"];
    const messagesB = ["msg-1", "msg-2"];

    const { rerender } = renderHook(({ deps }) => useScrollToBottom({ autoScrollDeps: deps }), {
      initialProps: { deps: [messagesA] },
    });

    mockScrollIntoViewFn.mockClear();

    rerender({ deps: [messagesB] });

    expect(mockScrollIntoViewFn).toHaveBeenCalled();
  });

  it("exposes scrollableRef so callers can attach it to the scroll container", () => {
    const { result } = renderHook(() => useScrollToBottom());

    expect(result.current).toHaveProperty("scrollableRef");
    expect(result.current.scrollableRef).toHaveProperty("current");
  });
});

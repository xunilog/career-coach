// src/renderer/hooks/useScrollToBottom.ts
// ---------------------------------------------------------------------------
// Auto-scroll-to-bottom hook for chat windows. Scrolls to the bottom
// whenever autoScrollDeps change — no longer gates on user scroll position.
// ---------------------------------------------------------------------------

import { useCallback, useEffect } from "react";
import { useScrollIntoView } from "@mantine/hooks";

const SCROLL_AT_BOTTOM_THRESHOLD = 2;

export interface UseScrollToBottomOptions {
  /** Dependencies that trigger auto-scroll when they change. */
  autoScrollDeps?: unknown[];
}

export function useScrollToBottom(options: UseScrollToBottomOptions = {}) {
  const { autoScrollDeps = [] } = options;

  const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<
    HTMLDivElement,
    HTMLDivElement
  >({ duration: 0 });

  const scrollToBottom = useCallback(() => {
    scrollIntoView({ alignment: "end" });
  }, [scrollIntoView]);

  // Always scroll to bottom when deps change — no longer checks
  // whether the user previously scrolled up.
  // Defer to next animation frame so the browser has laid out new content
  // before we scroll — otherwise scrollIntoView uses stale scrollHeight.
  // Skip scrolling if already at the bottom to avoid unnecessary scrollTop
  // assignments that can clear text selection in Chromium.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = scrollableRef.current;
    if (el) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom <= SCROLL_AT_BOTTOM_THRESHOLD) return;
    }
    requestAnimationFrame(() => {
      scrollIntoView({ alignment: "end" });
    });
  }, autoScrollDeps);

  return { scrollToBottom, bottomRef: targetRef, scrollableRef };
}

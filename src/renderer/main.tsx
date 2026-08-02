// src/main.tsx
// ---------------------------------------------------------------------------
// React entry point — mounts the App inside MantineProvider + QueryClientProvider.
// ---------------------------------------------------------------------------

import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import "@fontsource/noto-sans";
import "@fontsource/noto-sans-mono";
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import { theme } from "./theme";
import { App } from "./App";

// ── Global error capture for debugging Electron blank-screen ─────────
window.addEventListener("error", (event) => {
  const el = document.getElementById("root");
  if (el) {
    el.innerHTML = `<div style="padding:40px;color:#ff6b6b;background:#1a1a2e;font-family:monospace;min-height:100vh"><h1>⚠ Global Error</h1><pre style="white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.6;background:#0d0d1a;padding:16px;border-radius:8px">${event.error?.stack || event.error?.message || event.message}</pre></div>`;
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const el = document.getElementById("root");
  if (el) {
    el.innerHTML = `<div style="padding:40px;color:#ff6b6b;background:#1a1a2e;font-family:monospace;min-height:100vh"><h1>⚠ Unhandled Promise Rejection</h1><pre style="white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.6;background:#0d0d1a;padding:16px;border-radius:8px">${event.reason?.stack || event.reason?.message || String(event.reason)}</pre></div>`;
  }
});

// ── Error Boundary to catch render crashes ────────────────────────────

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          id="error-boundary"
          style={{
            padding: "40px",
            color: "#ff6b6b",
            background: "#1a1a2e",
            fontFamily: "monospace",
            minHeight: "100vh",
          }}
        >
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>⚠ Application Error</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "14px",
              lineHeight: "1.6",
              background: "#0d0d1a",
              padding: "16px",
              borderRadius: "8px",
            }}
          >
            {this.state.error.stack || this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <DatesProvider settings={{}}>
            <Notifications position="top-right" />
            <App />
          </DatesProvider>
        </MantineProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

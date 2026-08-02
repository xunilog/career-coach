// src/theme.ts
// ---------------------------------------------------------------------------
// Mantine 9.2 theme — dark color scheme matching the career coach aesthetic.
// ---------------------------------------------------------------------------

import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily: "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMonospace: "'Noto Sans Mono', 'JetBrains Mono', 'Fira Code', monospace",
  headings: {
    fontFamily: "'Noto Sans', sans-serif",
    fontWeight: "600",
  },
  colors: {
    // Custom agent-matching palette
    coach: [
      "#f5f0e8",
      "#e8d5b7",
      "#d4bb8c",
      "#c4a882",
      "#b08a5c",
      "#9c7144",
      "#7a5835",
      "#5c4026",
      "#3d2a19",
      "#1f140c",
    ] as const,
    profile: [
      "#eef6fb",
      "#cbe2f2",
      "#a8cee8",
      "#85b9df",
      "#5b9ec9",
      "#3d84b5",
      "#2e6a94",
      "#1f5073",
      "#133752",
      "#0a1f30",
    ] as const,
    experience: [
      "#edf8f0",
      "#c9e8d1",
      "#a5d8b3",
      "#81c894",
      "#4caf78",
      "#3a9663",
      "#2c7a4e",
      "#1e5e3a",
      "#124227",
      "#092615",
    ] as const,
    resume: [
      "#f9edf4",
      "#f0cde2",
      "#e7add0",
      "#dd8dbe",
      "#c9537b",
      "#b03a62",
      "#8e2c4e",
      "#6c1f3b",
      "#491328",
      "#260a15",
    ] as const,
  },
});

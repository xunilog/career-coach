// src/renderer/stores/layoutStore.ts
// ---------------------------------------------------------------------------
// Zustand store for measured layout dimensions from the AppShell chrome.
// Components use these instead of hardcoded constants so the UI adapts
// when the actual rendered header size differs from the configured value.
// ---------------------------------------------------------------------------

import { create } from "zustand";

export interface LayoutState {
  /** Measured height (px) of the AppShell header. Defaults to 56 until measured. */
  appHeaderHeight: number;

  setAppHeaderHeight: (height: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  appHeaderHeight: 56, // matches AppShell header={{ height: 56 }}
  setAppHeaderHeight: (height) => set({ appHeaderHeight: height }),
}));

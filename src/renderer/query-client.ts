// src/renderer/query-client.ts
// ---------------------------------------------------------------------------
// Singleton QueryClient — shared between the provider tree and any module
// that needs to invalidate caches after a direct write (e.g. careerStore).
// ---------------------------------------------------------------------------

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

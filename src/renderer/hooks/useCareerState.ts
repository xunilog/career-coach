// src/renderer/hooks/useCareerState.ts
// ---------------------------------------------------------------------------
// Convenience hooks for selecting slices of the career store.
// ---------------------------------------------------------------------------

import { useCareerStore } from "../stores/careerStore";

export function useProfileComplete() {
  return useCareerStore((s) => {
    const p = s.profile;
    return (
      Object.keys(p).length > 0 && p.dominantColor !== undefined && p.dominantColor !== "unknown"
    );
  });
}

export function useHasExperiences() {
  return useCareerStore((s) => s.experiences.length > 0);
}

export function useCanAccessResume() {
  return useCareerStore((s) => s.canAccessResume());
}

/** Resume is complete when the draft has at least 100 characters of content. */
export function useResumeComplete() {
  return useCareerStore((s) => {
    const draft = s.resumeDraft ?? "";
    return draft.trim().length >= 100;
  });
}

export function useAgentProgress() {
  const profile = useCareerStore((s) => s.profile);
  const experiences = useCareerStore((s) => s.experiences);
  const resumeDraft = useCareerStore((s) => s.resumeDraft);
  const activeAgent = useCareerStore((s) => s.activeAgent);

  return { profile, experiences, resumeDraft, activeAgent } as const;
}

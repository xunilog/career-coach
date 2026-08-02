// src/renderer/components/job-detail/JobDetailOverlay.tsx
// ---------------------------------------------------------------------------
// Absolute-positioned overlay that renders JobDetailView on top of the list.
// Handles Escape key to close.
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { Box } from "@mantine/core";
import { JobDetailView } from "./JobDetailView";

interface JobDetailOverlayProps {
  jobId: string;
  searchId: string;
  onClose: () => void;
}

export function JobDetailOverlay({ jobId, searchId, onClose }: JobDetailOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <Box
      data-testid="job-detail-overlay"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        backgroundColor: "var(--mantine-color-body)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <JobDetailView jobId={jobId} searchId={searchId} onClose={onClose} />
    </Box>
  );
}

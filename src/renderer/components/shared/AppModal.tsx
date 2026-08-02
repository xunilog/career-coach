// src/renderer/components/shared/AppModal.tsx
// ---------------------------------------------------------------------------
// Shared modal with sticky header, scrollable content, and optional sticky
// footer. Thin wrapper around Mantine Modal that enforces the flex layout so
// only the content area scrolls — never the entire modal.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Modal, Box } from "@mantine/core";

interface AppModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  size?: string;
  children: ReactNode;
  footer?: ReactNode;
}

// Stable references so React doesn't unmount/remount on every render.
// Inline objects/function would create new identities, resetting scroll position.
const modalStyles = {
  content: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    maxHeight: "calc(100dvh - 2 * var(--modal-y-offset, 5dvh))",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flex: 1,
  },
} as const;

function PassthroughScrollArea({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AppModal({ opened, onClose, title, size = "lg", children, footer }: AppModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      styles={modalStyles}
      scrollAreaComponent={PassthroughScrollArea}
    >
      <Box style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{children}</Box>

      {footer && <Box pt="md">{footer}</Box>}
    </Modal>
  );
}

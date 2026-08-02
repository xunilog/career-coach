// src/renderer/components/job-detail/ExportToolbar.tsx
// ---------------------------------------------------------------------------
// Context-aware export toolbar for job detail view.
// Actions: Export PDF (context-aware), Copy to clipboard, Open Apply URL.
// ---------------------------------------------------------------------------

import { Button, Tooltip, Group } from "@mantine/core";
import { MdFileDownload, MdContentCopy, MdOpenInNew } from "react-icons/md";

interface ExportToolbarProps {
  documentType: "resume" | "cover";
  hasDocument: boolean;
  hasApplyUrl: boolean;
  onExportPdf: () => void;
  onCopy: () => void;
  onOpenUrl: () => void;
}

export function ExportToolbar({
  documentType,
  hasDocument,
  hasApplyUrl,
  onExportPdf,
  onCopy,
  onOpenUrl,
}: ExportToolbarProps) {
  const exportLabel = documentType === "resume" ? "Export Resume PDF" : "Export Cover PDF";
  const exportTooltip = hasDocument
    ? exportLabel
    : `Generate a ${documentType === "resume" ? "resume" : "cover letter"} first`;

  return (
    <Group gap="xs">
      <Tooltip label={exportTooltip}>
        <Button
          size="xs"
          variant="light"
          leftSection={<MdFileDownload size={14} />}
          disabled={!hasDocument}
          onClick={onExportPdf}
        >
          Export PDF
        </Button>
      </Tooltip>

      <Tooltip label="Copy full markdown to clipboard">
        <Button
          size="xs"
          variant="subtle"
          leftSection={<MdContentCopy size={14} />}
          disabled={!hasDocument}
          onClick={onCopy}
        >
          Copy
        </Button>
      </Tooltip>

      <Tooltip
        label={hasApplyUrl ? "Open apply URL in browser" : "No apply URL available for this job"}
      >
        <Button
          size="xs"
          variant="light"
          leftSection={<MdOpenInNew size={14} />}
          disabled={!hasApplyUrl}
          onClick={onOpenUrl}
        >
          Apply URL
        </Button>
      </Tooltip>
    </Group>
  );
}

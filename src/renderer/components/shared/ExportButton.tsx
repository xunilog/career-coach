// src/components/shared/ExportButton.tsx
// ---------------------------------------------------------------------------
// Export resume as PDF — uses browser print (Tauri webview).
// ---------------------------------------------------------------------------

import { Button } from "@mantine/core";
import { MdFileDownload } from "react-icons/md";

export function ExportButton() {
  const handleExport = () => {
    window.print();
  };

  return (
    <Button
      variant="light"
      color="resume.4"
      size="sm"
      fullWidth
      leftSection={<MdFileDownload size={16} />}
      onClick={handleExport}
    >
      Export PDF
    </Button>
  );
}

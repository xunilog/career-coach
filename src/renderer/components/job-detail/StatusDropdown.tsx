// src/renderer/components/job-detail/StatusDropdown.tsx
// ---------------------------------------------------------------------------
// Status dropdown for job detail — shows allowed transitions with emoji,
// triggers onChange when a new status is selected.
// ---------------------------------------------------------------------------

import { Select } from "@mantine/core";
import { getAllowedTransitions } from "../../../shared/status-transitions";

const STATUS_EMOJI: Record<string, string> = {
  "--": "—",
  Saved: "💾",
  "Applied 📤": "📤",
  "Interview 🤝": "🤝",
  "Offer 🎉": "🎉",
  "Rejected ❌": "❌",
  Archived: "📦",
  "Closed 🔒": "🔒",
};

interface StatusDropdownProps {
  currentStatus: string;
  onChange: (newStatus: string) => void;
  disabled?: boolean;
}

export function StatusDropdown({ currentStatus, onChange, disabled = false }: StatusDropdownProps) {
  const allowed = getAllowedTransitions(currentStatus);

  function displayLabel(status: string): string {
    const emoji = STATUS_EMOJI[status] ?? "";
    return status.includes(emoji) ? status : `${emoji} ${status}`;
  }

  const data = [currentStatus, ...allowed].map((status) => ({
    value: status,
    label: displayLabel(status),
  }));

  return (
    <Select
      data={data}
      value={currentStatus}
      onChange={(value) => {
        if (value && value !== currentStatus) {
          onChange(value);
        }
      }}
      disabled={disabled}
      comboboxProps={{ withinPortal: false }}
      styles={{
        input: {
          fontWeight: 600,
          fontSize: "0.85rem",
        },
      }}
      w={160}
    />
  );
}

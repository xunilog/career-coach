// src/renderer/components/editors/ColorsEditModal.tsx
// ---------------------------------------------------------------------------
// Modal for editing the Colors Profile section with structured Select
// dropdowns (dominant color, secondary color) and a TextInput for DISC.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { Select, Textarea, Button, Group, Text, Stack } from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import type { ColorProfile } from "../../../shared/state";

const DOMINANT_OPTIONS = [
  { value: "Red", label: "🔴 Red — Action-oriented, decisive, results-driven" },
  { value: "Yellow", label: "🟡 Yellow — Enthusiastic, sociable, persuasive" },
  { value: "Green", label: "🟢 Green — Supportive, patient, team-focused" },
  { value: "Blue", label: "🔵 Blue — Analytical, precise, systematic" },
  { value: "unknown", label: "❓ Not yet discovered" },
];

const SECONDARY_OPTIONS = [
  { value: "", label: "None" },
  ...DOMINANT_OPTIONS.filter((o) => o.value !== "unknown"),
];

interface ColorsEditModalProps {
  opened: boolean;
  onClose: () => void;
  initial: Pick<ColorProfile, "dominantColor" | "secondaryColor" | "discProfile">;
  onSave: (data: Pick<ColorProfile, "dominantColor" | "secondaryColor" | "discProfile">) => void;
}

export function ColorsEditModal({ opened, onClose, initial, onSave }: ColorsEditModalProps) {
  const [dominantColor, setDominantColor] = useState<string>(initial.dominantColor ?? "unknown");
  const [secondaryColor, setSecondaryColor] = useState<string>(initial.secondaryColor ?? "");
  const [discProfile, setDiscProfile] = useState<string>(initial.discProfile ?? "");

  // Reset form when modal opens with new initial values
  const [lastOpened, setLastOpened] = useState(false);
  if (opened && !lastOpened) {
    setDominantColor(initial.dominantColor ?? "unknown");
    setSecondaryColor(initial.secondaryColor ?? "");
    setDiscProfile(initial.discProfile ?? "");
    setLastOpened(true);
  }
  if (!opened && lastOpened) {
    setLastOpened(false);
  }

  const handleSave = useCallback(() => {
    onSave({
      dominantColor: dominantColor as ColorProfile["dominantColor"],
      secondaryColor: (secondaryColor || undefined) as ColorProfile["secondaryColor"],
      discProfile: discProfile || undefined,
    });
    onClose();
  }, [dominantColor, secondaryColor, discProfile, onSave, onClose]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Colors Profile"
      footer={
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleSave}>
            Save
          </Button>
        </Group>
      }
    >
      <Text size="sm" c="dimmed" mb="md">
        Your Colors profile describes your core personality type and how you interact with the
        world. DISC adds another layer of behavioral insight.
      </Text>

      <Stack gap="md">
        <Select
          label="Dominant Color"
          placeholder="Select your dominant color"
          data={DOMINANT_OPTIONS}
          value={dominantColor}
          onChange={(v) => setDominantColor(v ?? "unknown")}
          searchable
        />

        <Select
          label="Secondary Color"
          placeholder="Optional secondary color"
          data={SECONDARY_OPTIONS}
          value={secondaryColor}
          onChange={(v) => setSecondaryColor(v ?? "")}
          searchable
          clearable
        />

        <Textarea
          label="DISC Profile"
          placeholder='e.g., "D" (Dominant), "DI", "SC"...'
          value={discProfile}
          onChange={(e) => setDiscProfile(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={6}
        />
      </Stack>
    </AppModal>
  );
}

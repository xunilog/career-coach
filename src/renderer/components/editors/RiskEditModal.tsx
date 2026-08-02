// src/renderer/components/editors/RiskEditModal.tsx
// ---------------------------------------------------------------------------
// Modal for editing Risk & Adaptability — a Select for risk appetite level
// plus two minimal TipTap editors for risk details and change tolerance.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { Select, Button, Group, Text, Stack } from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import { MinimalTipTapEditor } from "./MinimalTipTapEditor";
import type { ColorProfile } from "../../../shared/state";

const RISK_OPTIONS = [
  { value: "low", label: "Low — Prefers stability and predictability" },
  { value: "medium", label: "Medium — Open to calculated risks" },
  { value: "high", label: "High — Thrives on bold moves and uncertainty" },
  { value: "unknown", label: "Not yet assessed" },
];

interface RiskEditModalProps {
  opened: boolean;
  onClose: () => void;
  initial: Pick<ColorProfile, "riskAppetite" | "riskProfileDetails" | "changeToleranceNotes">;
  onSave: (
    data: Pick<ColorProfile, "riskAppetite" | "riskProfileDetails" | "changeToleranceNotes">,
  ) => void;
}

export function RiskEditModal({ opened, onClose, initial, onSave }: RiskEditModalProps) {
  const [riskAppetite, setRiskAppetite] = useState<string>(initial.riskAppetite ?? "unknown");
  const [riskDetails, setRiskDetails] = useState<string>(initial.riskProfileDetails ?? "");
  const [changeTolerance, setChangeTolerance] = useState<string>(
    initial.changeToleranceNotes ?? "",
  );

  // Reset form when modal opens with new initial values
  const [lastOpened, setLastOpened] = useState(false);
  if (opened && !lastOpened) {
    setRiskAppetite(initial.riskAppetite ?? "unknown");
    setRiskDetails(initial.riskProfileDetails ?? "");
    setChangeTolerance(initial.changeToleranceNotes ?? "");
    setLastOpened(true);
  }
  if (!opened && lastOpened) {
    setLastOpened(false);
  }

  const handleSave = useCallback(() => {
    onSave({
      riskAppetite: riskAppetite as ColorProfile["riskAppetite"],
      riskProfileDetails: riskDetails,
      changeToleranceNotes: changeTolerance,
    });
    onClose();
  }, [riskAppetite, riskDetails, changeTolerance, onSave, onClose]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Risk & Adaptability"
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
        Your risk appetite and how you handle change shape which roles and environments fit you
        best.
      </Text>

      <Stack gap="md">
        <Select
          label="Risk Appetite"
          placeholder="Select your risk tolerance level"
          data={RISK_OPTIONS}
          value={riskAppetite}
          onChange={(v) => setRiskAppetite(v ?? "unknown")}
          searchable
        />

        <div>
          <Text size="sm" fw={500} mb={4}>
            Risk Profile Details
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            Why this risk level? What situations, industries, or contexts shape it?
          </Text>
          <MinimalTipTapEditor
            content={riskDetails}
            onChange={setRiskDetails}
            placeholder="Describe your risk profile..."
          />
        </div>

        <div>
          <Text size="sm" fw={500} mb={4}>
            Change Tolerance
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            How do you respond to change and ambiguity?
          </Text>
          <MinimalTipTapEditor
            content={changeTolerance}
            onChange={setChangeTolerance}
            placeholder="Describe your relationship with change..."
          />
        </div>
      </Stack>
    </AppModal>
  );
}

// src/renderer/components/editors/ResumeKeySkillsModal.tsx
// ---------------------------------------------------------------------------
// Modal for editing key skills in the reference resume.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { Button, Group, Text } from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import { SkillListEditor } from "./SkillListEditor";
import type { Skill } from "../../../shared/state";

interface ResumeKeySkillsModalProps {
  opened: boolean;
  onClose: () => void;
  initial: Skill[];
  onSave: (skills: Skill[]) => void;
}

export function ResumeKeySkillsModal({
  opened,
  onClose,
  initial,
  onSave,
}: ResumeKeySkillsModalProps) {
  const [skills, setSkills] = useState<Skill[]>(initial);

  // Reset form when modal opens
  const [lastOpened, setLastOpened] = useState(false);
  if (opened && !lastOpened) {
    setSkills([...initial]);
    setLastOpened(true);
  }
  if (!opened && lastOpened) {
    setLastOpened(false);
  }

  const handleSave = useCallback(() => {
    const filtered = skills.filter((s) => s.name.trim().length > 0);
    onSave(filtered);
    onClose();
  }, [skills, onSave, onClose]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Key Skills"
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
        List all your professional skills. Assign a category to each skill for better organization.
        Categories help the AI coach and resume generator understand your skill profile.
      </Text>

      <SkillListEditor skills={skills} onChange={setSkills} />
    </AppModal>
  );
}

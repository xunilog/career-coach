// src/renderer/components/editors/ResumeLanguagesModal.tsx
// ---------------------------------------------------------------------------
// Modal for editing language entries in the reference resume.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { TextInput, Select, Button, Group, Text, ActionIcon, Stack } from "@mantine/core";
import { MdDelete, MdAdd } from "react-icons/md";
import { v4 as uuid } from "uuid";
import { AppModal } from "../shared/AppModal";
import type { LanguageEntry } from "../../../shared/state";

const PROFICIENCY_OPTIONS = [
  { value: "native", label: "Native" },
  { value: "fluent", label: "Fluent" },
  { value: "advanced", label: "Advanced" },
  { value: "intermediate", label: "Intermediate" },
  { value: "basic", label: "Basic" },
];

interface ResumeLanguagesModalProps {
  opened: boolean;
  onClose: () => void;
  initial: LanguageEntry[];
  onSave: (data: LanguageEntry[]) => void;
}

function emptyEntry(): LanguageEntry {
  return { id: uuid(), language: "", proficiency: "intermediate" };
}

export function ResumeLanguagesModal({
  opened,
  onClose,
  initial,
  onSave,
}: ResumeLanguagesModalProps) {
  const [entries, setEntries] = useState<LanguageEntry[]>(() =>
    initial.length > 0 ? [...initial] : [emptyEntry()],
  );

  // Reset form when modal opens with new initial values
  const [lastOpened, setLastOpened] = useState(false);
  if (opened && !lastOpened) {
    setEntries(initial.length > 0 ? [...initial] : [emptyEntry()]);
    setLastOpened(true);
  }
  if (!opened && lastOpened) {
    setLastOpened(false);
  }

  const updateEntry = useCallback((id: string, field: keyof LanguageEntry, value: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, emptyEntry()]);
  }, []);

  const handleSave = useCallback(() => {
    onSave(entries.filter((e) => e.language.trim().length > 0));
    onClose();
  }, [entries, onSave, onClose]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Languages"
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
        Add the languages you speak and your proficiency level in each.
      </Text>

      <Stack gap="md">
        {entries.map((entry) => (
          <Group key={entry.id} gap="xs" wrap="nowrap" align="flex-end">
            <TextInput
              label="Language"
              placeholder="French"
              value={entry.language}
              onChange={(e) => updateEntry(entry.id, "language", e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Select
              label="Proficiency"
              data={PROFICIENCY_OPTIONS}
              value={entry.proficiency}
              onChange={(v) => updateEntry(entry.id, "proficiency", v ?? "intermediate")}
              style={{ width: 160 }}
            />
            {entries.length > 1 && (
              <ActionIcon
                variant="subtle"
                color="red"
                size="md"
                onClick={() => removeEntry(entry.id)}
                mb={4}
              >
                <MdDelete size={14} />
              </ActionIcon>
            )}
          </Group>
        ))}

        <Button variant="light" leftSection={<MdAdd size={16} />} onClick={addEntry} fullWidth>
          Add Language
        </Button>
      </Stack>
    </AppModal>
  );
}

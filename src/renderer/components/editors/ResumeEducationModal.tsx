// src/renderer/components/editors/ResumeEducationModal.tsx
// ---------------------------------------------------------------------------
// Modal for editing education entries in the reference resume.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { TextInput, Button, Group, Text, ActionIcon, Stack, SimpleGrid } from "@mantine/core";
import { MdDelete, MdAdd } from "react-icons/md";
import { v4 as uuid } from "uuid";
import { AppModal } from "../shared/AppModal";
import type { EducationEntry } from "../../../shared/state";

interface ResumeEducationModalProps {
  opened: boolean;
  onClose: () => void;
  initial: EducationEntry[];
  onSave: (data: EducationEntry[]) => void;
}

function emptyEntry(): EducationEntry {
  return { id: uuid(), institution: "", degree: "", field: "", startDate: "", endDate: "" };
}

export function ResumeEducationModal({
  opened,
  onClose,
  initial,
  onSave,
}: ResumeEducationModalProps) {
  const [entries, setEntries] = useState<EducationEntry[]>(() =>
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

  const updateEntry = useCallback((id: string, field: keyof EducationEntry, value: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, emptyEntry()]);
  }, []);

  const handleSave = useCallback(() => {
    onSave(entries.filter((e) => e.institution || e.degree));
    onClose();
  }, [entries, onSave, onClose]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Education"
      size="lg"
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
        Add your degrees, certifications, and significant training programs.
      </Text>

      <Stack gap="md">
        {entries.map((entry) => (
          <Stack key={entry.id} gap="xs" pb="sm" style={{ borderBottom: "1px solid #eee" }}>
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Education Entry
              </Text>
              {entries.length > 1 && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => removeEntry(entry.id)}
                >
                  <MdDelete size={14} />
                </ActionIcon>
              )}
            </Group>

            <SimpleGrid cols={2} spacing="xs">
              <TextInput
                label="Institution"
                placeholder="HEC Paris"
                value={entry.institution}
                onChange={(e) => updateEntry(entry.id, "institution", e.currentTarget.value)}
              />
              <TextInput
                label="Degree"
                placeholder="Master"
                value={entry.degree}
                onChange={(e) => updateEntry(entry.id, "degree", e.currentTarget.value)}
              />
            </SimpleGrid>

            <TextInput
              label="Field of Study"
              placeholder="Management"
              value={entry.field}
              onChange={(e) => updateEntry(entry.id, "field", e.currentTarget.value)}
            />

            <SimpleGrid cols={2} spacing="xs">
              <TextInput
                label="Start Year"
                placeholder="2012"
                value={entry.startDate}
                onChange={(e) => updateEntry(entry.id, "startDate", e.currentTarget.value)}
              />
              <TextInput
                label="End Year"
                placeholder="2015"
                value={entry.endDate}
                onChange={(e) => updateEntry(entry.id, "endDate", e.currentTarget.value)}
              />
            </SimpleGrid>
          </Stack>
        ))}

        <Button variant="light" leftSection={<MdAdd size={16} />} onClick={addEntry} fullWidth>
          Add Education
        </Button>
      </Stack>
    </AppModal>
  );
}

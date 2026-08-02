// src/renderer/components/editors/SkillListEditor.tsx
// ---------------------------------------------------------------------------
// Reusable controlled component for editing a list of skills with categories.
// Each row has a name input, category dropdown, and remove button.
// ---------------------------------------------------------------------------

import { useCallback } from "react";
import { TextInput, Select, Button, Group, Text, ActionIcon, Stack } from "@mantine/core";
import { MdDelete, MdAdd } from "react-icons/md";
import { SKILL_CATEGORIES } from "../../../shared/state";
import type { Skill, SkillCategory } from "../../../shared/state";

const CATEGORY_OPTIONS = SKILL_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
}));

interface SkillListEditorProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
  label?: string;
  placeholder?: string;
}

export function SkillListEditor({ skills, onChange, label, placeholder }: SkillListEditorProps) {
  const updateSkill = useCallback(
    (index: number, field: keyof Skill, value: string) => {
      const updated = skills.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      onChange(updated);
    },
    [skills, onChange],
  );

  const removeSkill = useCallback(
    (index: number) => {
      onChange(skills.filter((_, i) => i !== index));
    },
    [skills, onChange],
  );

  const addSkill = useCallback(() => {
    onChange([...skills, { name: "", category: "technical" as SkillCategory }]);
  }, [skills, onChange]);

  return (
    <Stack gap="xs">
      {label && (
        <Text size="xs" fw={500}>
          {label}
        </Text>
      )}

      {skills.length === 0 ? (
        <Text size="sm" c="dimmed" fs="italic">
          No skills added yet.
        </Text>
      ) : (
        skills.map((skill, index) => (
          <Group key={index} gap="xs" wrap="nowrap" align="flex-end">
            <TextInput
              placeholder={placeholder ?? "Enter skill name"}
              value={skill.name}
              onChange={(e) => updateSkill(index, "name", e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Select
              data={CATEGORY_OPTIONS}
              value={skill.category}
              onChange={(v) => updateSkill(index, "category", (v as SkillCategory) ?? "technical")}
              style={{ width: 140 }}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              onClick={() => removeSkill(index)}
              mb={4}
              aria-label="Remove skill"
            >
              <MdDelete size={14} />
            </ActionIcon>
          </Group>
        ))
      )}

      <Button variant="light" leftSection={<MdAdd size={16} />} onClick={addSkill} fullWidth>
        Add Skill
      </Button>
    </Stack>
  );
}

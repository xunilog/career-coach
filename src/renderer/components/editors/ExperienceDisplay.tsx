// src/renderer/components/editors/ExperienceDisplay.tsx
// ---------------------------------------------------------------------------
// Maps over the experiences array from the career store and renders
// ExperienceCards. Includes an empty-state placeholder and an "Add Experience"
// button at the bottom.
// ---------------------------------------------------------------------------

import { Stack, Text, Button, ScrollArea } from "@mantine/core";
import { MdAdd } from "react-icons/md";
import { useCareerStore } from "../../stores/careerStore";
import { ExperienceCard } from "./ExperienceCard";
import type { Experience } from "../../../shared/state";

// ── Props ──────────────────────────────────────────────────────────────────

export interface ExperienceDisplayProps {
  onEditExperience: (experience: Experience) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function emptyExperience(): Experience {
  return {
    id: crypto.randomUUID(),
    company: "",
    title: "",
    startDate: "",
    endDate: "present",
    sector: "unknown",
    raciRoles: [],
    keyProjects: [],
    quantifiedAchievements: [],
    skillsDemonstrated: [],
    challenges: "",
    rawNotes: "",
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export function ExperienceDisplay({ onEditExperience }: ExperienceDisplayProps) {
  const experiences = useCareerStore((s) => s.experiences);

  return (
    <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
      <Button
        variant="light"
        leftSection={<MdAdd size={16} />}
        onClick={() => onEditExperience(emptyExperience())}
        fullWidth
      >
        Add Experience
      </Button>
      <ScrollArea style={{ flex: 1 }} scrollbarSize={8}>
        {experiences.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No experiences yet. Start a conversation with the Experience Coach or add one manually.
          </Text>
        ) : (
          <Stack gap={0}>
            {experiences.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} onEdit={() => onEditExperience(exp)} />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}

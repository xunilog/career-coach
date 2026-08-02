// src/components/shared/StatePanel.tsx
// ---------------------------------------------------------------------------
// Shows current CareerState — profile fields, experience count, active agent.
// ---------------------------------------------------------------------------

import { Paper, Stack, Group, Text, Badge, Divider } from "@mantine/core";
import {
  MdPsychology,
  MdExplore,
  MdWork,
  MdDescription,
  MdCheck,
  MdCheckBoxOutlineBlank,
} from "react-icons/md";
import { useAgentProgress } from "../../hooks/useCareerState";

const ICON_SIZE = 12;

const AGENT_LABELS: Record<string, React.ReactNode> = {
  router: (
    <>
      <MdPsychology size={ICON_SIZE} /> Career Coach
    </>
  ),
  profile: (
    <>
      <MdExplore size={ICON_SIZE} /> Profile Coach
    </>
  ),
  experience: (
    <>
      <MdWork size={ICON_SIZE} /> Experience Coach
    </>
  ),
  resume: (
    <>
      <MdDescription size={ICON_SIZE} /> Resume Coach
    </>
  ),
};

export function StatePanel() {
  const { profile, experiences, resumeDraft, activeAgent } = useAgentProgress();

  const profileKeys = Object.keys(profile).filter(
    (k) => profile[k as keyof typeof profile] !== undefined,
  );

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          Career State
        </Text>

        <Group gap="xs">
          <Text size="sm" fw={600}>
            Profile:
          </Text>
          {profileKeys.length > 0 ? (
            <Badge variant="light" color="profile.4" size="sm">
              <MdCheck size={10} /> {profileKeys.length} fields
            </Badge>
          ) : (
            <Badge variant="light" color="gray" size="sm">
              <MdCheckBoxOutlineBlank size={10} /> Empty
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={600}>
            Experiences:
          </Text>
          <Badge variant="light" color={experiences.length > 0 ? "experience.4" : "gray"} size="sm">
            {experiences.length > 0 ? (
              <>
                <MdCheck size={10} /> {experiences.length}
              </>
            ) : (
              <>
                <MdCheckBoxOutlineBlank size={10} /> None
              </>
            )}
          </Badge>
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={600}>
            Resume:
          </Text>
          {resumeDraft ? (
            <Badge variant="light" color="resume.4" size="sm">
              <MdCheck size={10} /> Draft ready
            </Badge>
          ) : (
            <Badge variant="light" color="gray" size="sm">
              <MdCheckBoxOutlineBlank size={10} /> Not started
            </Badge>
          )}
        </Group>

        <Divider />

        <Group gap="xs">
          <Text size="sm" fw={600}>
            Active:
          </Text>
          <Text size="sm">{AGENT_LABELS[activeAgent] ?? activeAgent}</Text>
        </Group>
      </Stack>
    </Paper>
  );
}

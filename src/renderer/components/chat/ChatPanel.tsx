// src/components/chat/ChatPanel.tsx
// ---------------------------------------------------------------------------
// Overview page — welcome message and profile progress stepper.
// Replaces the old general-chat-agent-based WelcomePage.
// ---------------------------------------------------------------------------

import { useNavigate } from "react-router-dom";
import {
  Container,
  Stack,
  Paper,
  Text,
  Title,
  ThemeIcon,
  Button,
  Group,
  Stepper,
} from "@mantine/core";
import { MdExplore, MdWork, MdDescription, MdLock, MdCheck } from "react-icons/md";
import {
  useProfileComplete,
  useHasExperiences,
  useCanAccessResume,
  useResumeComplete,
} from "../../hooks/useCareerState";

const ICON_SIZE = 18;

const STEPS = [
  {
    label: "Profile",
    description: "Discover your professional personality",
    icon: <MdExplore size={ICON_SIZE} />,
    path: "/profile",
    color: "profile.4",
  },
  {
    label: "Experience",
    description: "Document your career history",
    icon: <MdWork size={ICON_SIZE} />,
    path: "/experience",
    color: "experience.4",
  },
  {
    label: "Resume",
    description: "Build a tailored resume",
    icon: <MdDescription size={ICON_SIZE} />,
    path: "/resume",
    color: "resume.4",
  },
] as const;

export function WelcomePage() {
  const navigate = useNavigate();
  const profileComplete = useProfileComplete();
  const hasExperiences = useHasExperiences();
  const canAccessResume = useCanAccessResume();
  const resumeComplete = useResumeComplete();

  const completed = [profileComplete, hasExperiences, resumeComplete];
  const completedCount = completed.filter(Boolean).length;
  const firstIncomplete = completed.findIndex((c) => !c);
  const activeStep = firstIncomplete === -1 ? 2 : firstIncomplete; // all done → last step active

  const stepStatus: Array<"completed" | "active" | "locked"> = completed.map((isDone, i) => {
    if (isDone) return "completed";
    if (i === 0 || (i === 1 && profileComplete) || (i === 2 && canAccessResume)) return "active";
    return "locked";
  });

  return (
    <Container
      size="md"
      py="xl"
      fluid
      h="100%"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Stack gap="lg" style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%" }}>
        {/* ── Welcome section ──────────────────────────────────────── */}
        <Paper withBorder p="lg" radius="md">
          <Stack gap="sm">
            <Title order={2}>Welcome to Career Coach</Title>
            <Text c="dimmed">
              Your AI-powered career companion helps you prepare for your next job in three steps.
              Each step has a dedicated coach to guide you through the process.
            </Text>
            <Stack gap={6}>
              {STEPS.map((step, i) => (
                <Group key={step.path} gap="sm">
                  <ThemeIcon
                    variant="light"
                    size="sm"
                    color={stepStatus[i] === "locked" ? "gray.5" : step.color}
                    radius="xl"
                  >
                    {stepStatus[i] === "locked" ? <MdLock size={14} /> : step.icon}
                  </ThemeIcon>
                  <Text size="sm">
                    <Text span fw={600}>
                      {step.label}:
                    </Text>{" "}
                    {step.description}
                    {completed[i] && (
                      <Text span c={step.color} ml={4}>
                        ✓
                      </Text>
                    )}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Paper>

        {/* ── Progress stepper ─────────────────────────────────────── */}
        <Paper withBorder p="lg" radius="md">
          <Stack gap="md">
            <Text size="sm" fw={600} c="dimmed" tt="uppercase">
              Your Progress
            </Text>

            <Stepper active={activeStep} size="sm">
              {STEPS.map((step, i) => {
                const status = stepStatus[i];
                return (
                  <Stepper.Step
                    key={step.path}
                    label={step.label}
                    description={
                      status === "completed" ? "Done" : status === "locked" ? "Locked" : "Next up"
                    }
                    icon={status === "locked" ? <MdLock size={ICON_SIZE} /> : step.icon}
                    completedIcon={<MdCheck size={ICON_SIZE} />}
                    color={status === "locked" ? "gray.5" : step.color}
                  />
                );
              })}
            </Stepper>

            <Text size="xs" c="dimmed" ta="center">
              {completedCount}/3 steps completed
              {completedCount === 3 && " — you're all set!"}
            </Text>

            {/* ── Navigation buttons ───────────────────────────────── */}
            <Group justify="center" gap="sm">
              <Button
                variant={profileComplete ? "outline" : "filled"}
                color="profile.4"
                leftSection={<MdExplore size={16} />}
                onClick={() => navigate("/profile")}
              >
                {profileComplete ? "View Profile" : "Start Profile"}
              </Button>
              <Button
                variant={hasExperiences ? "outline" : "filled"}
                color="experience.4"
                leftSection={<MdWork size={16} />}
                onClick={() => navigate("/experience")}
                disabled={!profileComplete}
              >
                {hasExperiences ? "View Experience" : "Add Experience"}
              </Button>
              <Button
                variant={canAccessResume ? "outline" : "filled"}
                color="resume.4"
                leftSection={<MdDescription size={16} />}
                onClick={() => navigate("/resume")}
                disabled={!canAccessResume}
              >
                {canAccessResume ? "View Resume" : "Build Resume"}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

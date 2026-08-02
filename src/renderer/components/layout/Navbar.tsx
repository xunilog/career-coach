// src/components/layout/Navbar.tsx
// ---------------------------------------------------------------------------
// Sidebar navigation with step gating + job search navigation.
// Coaching steps 1-3 (Profile, Experience, Resume). Job search section below.
// ---------------------------------------------------------------------------

import { useNavigate, useLocation } from "react-router-dom";
import {
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  Badge,
  Progress,
  Divider,
  Box,
} from "@mantine/core";
import { MdExplore, MdWork, MdDescription, MdHome, MdLock, MdCheck } from "react-icons/md";
import {
  useProfileComplete,
  useHasExperiences,
  useCanAccessResume,
  useResumeComplete,
} from "../../hooks/useCareerState";
import { NavPanel } from "../nav/NavPanel";

interface StepDef {
  path: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  step: number;
}

const ICON_SIZE = 14;

const STEPS: StepDef[] = [
  {
    path: "/profile",
    label: "Profile",
    icon: <MdExplore size={ICON_SIZE} />,
    color: "profile.4",
    step: 1,
  },
  {
    path: "/experience",
    label: "Experience",
    icon: <MdWork size={ICON_SIZE} />,
    color: "experience.4",
    step: 2,
  },
  {
    path: "/resume",
    label: "Resume",
    icon: <MdDescription size={ICON_SIZE} />,
    color: "resume.4",
    step: 3,
  },
];

export function CareerNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const profileComplete = useProfileComplete();
  const hasExperiences = useHasExperiences();
  const canAccessResume = useCanAccessResume();
  const resumeComplete = useResumeComplete();

  const stepStatus = {
    1: profileComplete,
    2: hasExperiences,
    3: resumeComplete,
  };

  const completedSteps = [profileComplete, hasExperiences, resumeComplete].filter(Boolean).length;
  const progressPercent = (completedSteps / 3) * 100;

  return (
    <Stack gap="xs">
      {/* Progress bar */}
      <Stack gap={4} mb="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          Progress
        </Text>
        <Progress
          value={progressPercent}
          size="sm"
          color={
            completedSteps === 3 ? "experience.4" : completedSteps >= 1 ? "profile.4" : "gray.5"
          }
        />
        <Text size="xs" c="dimmed" ta="right">
          {completedSteps}/3 completed
        </Text>
      </Stack>

      {/* Step navigation */}
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
        About You
      </Text>

      {/* Overview — default landing page */}
      <NavLink
        label="Overview"
        leftSection={
          <ThemeIcon
            variant={location.pathname === "/" ? "filled" : "light"}
            size="sm"
            color="orange"
            radius="xl"
          >
            <MdHome size={14} />
          </ThemeIcon>
        }
        active={location.pathname === "/"}
        onClick={() => navigate("/")}
        styles={{ root: { borderRadius: 8 } }}
      />

      {STEPS.map((step) => {
        const isActive = location.pathname === step.path;
        const isDone = stepStatus[step.step as keyof typeof stepStatus];
        const isLocked = step.step === 3 && !canAccessResume;

        const link = (
          <NavLink
            key={step.path}
            label={step.label}
            leftSection={
              <ThemeIcon
                variant={isActive ? "filled" : "light"}
                size="sm"
                color={isLocked ? "gray.5" : step.color}
                radius="xl"
              >
                {step.icon}
              </ThemeIcon>
            }
            rightSection={
              isLocked ? (
                <MdLock size={14} style={{ opacity: 0.5 }} />
              ) : isDone ? (
                <Badge size="xs" color={step.color}>
                  <MdCheck />
                </Badge>
              ) : null
            }
            active={isActive}
            disabled={isLocked}
            onClick={() => navigate(step.path)}
            styles={{
              root: {
                borderRadius: 8,
                opacity: isLocked ? 0.5 : 1,
              },
            }}
          />
        );

        if (isLocked) {
          return (
            <Tooltip
              key={step.path}
              label="Complete your profile and at least one experience first"
              position="right"
              withArrow
            >
              {link}
            </Tooltip>
          );
        }

        return link;
      })}

      {/* ── Job Search section ──────────────────────────────────── */}
      <Divider my="sm" />
      <Box style={{ flex: 1, overflow: "auto" }}>
        <NavPanel
          onSelectSearch={(id) => navigate(`/search/${id}`)}
          onSelectInbox={() => navigate("/inbox")}
        />
      </Box>
    </Stack>
  );
}

// src/components/editors/ExperienceEditor.tsx
// ---------------------------------------------------------------------------
// Experience editor — two-column layout: experience cards on the left,
// Experience Coach chat on the right. Each card has an edit button that
// opens a full structured modal for editing all 15+ Experience fields.
// Includes "Add Experience" at the bottom of the card list.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { useViewportSize, useElementSize } from "@mantine/hooks";
import {
  Divider,
  Group,
  Grid,
  ScrollArea,
  useMantineTheme,
  Box,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useCareerStore } from "../../stores/careerStore";
import { ExperienceDisplay } from "./ExperienceDisplay";
import { ExperienceEditModal } from "./ExperienceEditModal";
import { CoachChatPanel } from "../chat/CoachChatPanel";
import type { Experience } from "../../../shared/state";
import { MdWork } from "react-icons/md";
import { useLayoutStore } from "../../stores/layoutStore";

export function ExperienceEditor() {
  const experiences = useCareerStore((s) => s.experiences);
  const addExperience = useCareerStore((s) => s.addExperience);
  const updateExperience = useCareerStore((s) => s.updateExperience);
  const removeExperience = useCareerStore((s) => s.removeExperience);
  const theme = useMantineTheme();

  // ── Modal state ────────────────────────────────────────────────────
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);

  const openModal = useCallback((experience: Experience) => {
    setEditingExperience(experience);
  }, []);

  const closeModal = useCallback(() => {
    setEditingExperience(null);
  }, []);

  // ── Delete handler ───────────────────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      removeExperience(id);
    },
    [removeExperience],
  );

  // ── Save handler — add or update based on whether the id already exists ─
  const handleSave = useCallback(
    (experience: Experience) => {
      const exists = experiences.some((e) => e.id === experience.id);
      if (exists) {
        updateExperience(experience.id, experience);
      } else {
        addExperience(experience);
      }
    },
    [experiences, addExperience, updateExperience],
  );

  // ── Observe the container to know exact available height ────────────
  const appHeaderHeight = useLayoutStore((s) => s.appHeaderHeight);
  const { height: viewportH } = useViewportSize();
  const { ref: profileHeaderRef, height: profileHeaderH } = useElementSize({ box: "border-box" });
  const colH = `calc(${viewportH}px - ${appHeaderHeight}px)`;

  return (
    <Box h="100%" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Grid h={colH} gap={0}>
        {/* ── Left: Experience cards ────────────────────────────────── */}
        <Grid.Col span={6}>
          <Box ref={profileHeaderRef}>
            <Group p="md">
              <ThemeIcon color="experience.4" variant="transparent">
                <MdWork size={20} />
              </ThemeIcon>
              <Text>Add your experience, with our AI assistant</Text>
            </Group>
            <Divider />
          </Box>
          <ScrollArea h={`calc(${colH} - ${profileHeaderH}px)`} scrollbarSize={8}>
            <ExperienceDisplay onEditExperience={openModal} />
          </ScrollArea>
        </Grid.Col>

        {/* ── Right: Experience Coach chat ──────────────────────────── */}
        <Grid.Col span={6}>
          <Box h="100%" style={{ display: "flex", alignItems: "stretch" }}>
            <Divider orientation="vertical" />
            <Box style={{ flex: 1 }}>
              <CoachChatPanel
                coachType="experience"
                emptyStateText="Talk to your Experience Coach to document your past roles with quantified achievements and STAR stories."
                placeholder="Tell the Experience Coach about a past role..."
                forceAgent="experience"
                colH={colH}
                themeSpacing={theme.spacing.md}
              />
            </Box>
          </Box>
        </Grid.Col>
      </Grid>

      {/* ── Edit Modal ──────────────────────────────────────────────── */}
      {editingExperience && (
        <ExperienceEditModal
          opened={editingExperience !== null}
          onClose={closeModal}
          experience={editingExperience}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </Box>
  );
}

// src/components/editors/ProfileEditor.tsx
// ---------------------------------------------------------------------------
// Profile editor — two-column layout: section display on the left,
// Profile Coach chat on the right. Each section has an edit button that
// opens a modal for structured editing (form controls or minimal TipTap).
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { useViewportSize, useElementSize } from "@mantine/hooks";
import { Group, Grid, ScrollArea, Box, Text, Divider, ThemeIcon } from "@mantine/core";
import { useCareerStore } from "../../stores/careerStore";
import { ProfileDisplay } from "./ProfileDisplay";
import type { EditSection } from "./ProfileDisplay";
import { SectionEditModal } from "./SectionEditModal";
import { ColorsEditModal } from "./ColorsEditModal";
import { RiskEditModal } from "./RiskEditModal";
import { CoachChatPanel } from "../chat/CoachChatPanel";
import { MdExplore } from "react-icons/md";
import { useLayoutStore } from "../../stores/layoutStore";

export function ProfileEditor() {
  const profile = useCareerStore((s) => s.profile);
  const setProfileFields = useCareerStore((s) => s.setProfileFields);

  // ── Modal state ────────────────────────────────────────────────────
  const [editingSection, setEditingSection] = useState<EditSection | null>(null);

  const openModal = useCallback((section: EditSection) => {
    setEditingSection(section);
  }, []);

  const closeModal = useCallback(() => {
    setEditingSection(null);
  }, []);

  // ── Observe the container to know exact available height ────────────
  const appHeaderHeight = useLayoutStore((s) => s.appHeaderHeight);
  const { height: viewportH } = useViewportSize();
  const { ref: profileHeaderRef, height: profileHeaderH } = useElementSize({ box: "border-box" });
  const colH = `calc(${viewportH}px - ${appHeaderHeight}px)`;

  return (
    <Box h="100%" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Grid h={colH} gap={0}>
        {/* ── Left: Profile section display ────────────────────────── */}
        <Grid.Col span={6}>
          <Box ref={profileHeaderRef}>
            <Group p="md">
              <ThemeIcon color="profile.4" variant="transparent">
                <MdExplore size={20} />
              </ThemeIcon>
              <Text>Determine your personality, with our AI assistant</Text>
            </Group>
            <Divider />
          </Box>
          <ScrollArea h={`calc(${colH} - ${profileHeaderH}px)`} scrollbarSize={8}>
            <ProfileDisplay onEditSection={openModal} />
          </ScrollArea>
        </Grid.Col>

        {/* ── Right: Profile Coach chat ──────────────────────────── */}
        <Grid.Col span={6}>
          <Box h="100%" style={{ display: "flex", alignItems: "stretch" }}>
            <Divider orientation="vertical" />
            <Box style={{ flex: 1 }}>
              <CoachChatPanel
                coachType="profile"
                emptyStateText="Start a conversation with your Profile Coach to map your strengths, motivations, and ideal work style."
                placeholder="Tell the Profile Coach about yourself..."
                forceAgent="profile"
                colH={colH}
              />
            </Box>
          </Box>
        </Grid.Col>
      </Grid>

      {/* ── Edit Modals ──────────────────────────────────────────────── */}

      {/* Colors Profile — structured Select dropdowns */}
      <ColorsEditModal
        opened={editingSection === "colors"}
        onClose={closeModal}
        initial={{
          dominantColor: profile.dominantColor ?? "unknown",
          secondaryColor: profile.secondaryColor,
          discProfile: profile.discProfile,
        }}
        onSave={(data) => setProfileFields(data)}
      />

      {/* Career Drivers — TipTap bullet list */}
      <SectionEditModal
        opened={editingSection === "drivers"}
        onClose={closeModal}
        title="Career Drivers"
        explanation="What energises you at work? List the things that drive and motivate you — autonomy, impact, recognition, security, growth, variety..."
        initialContent={arrayToMarkdownList(profile.careerDrivers)}
        onSave={(md) => setProfileFields({ careerDrivers: markdownListToArray(md) })}
      />

      {/* Work Style Preferences — TipTap bullet list */}
      <SectionEditModal
        opened={editingSection === "workStyle"}
        onClose={closeModal}
        title="Work Style Preferences"
        explanation="How do you prefer to work? Collaborative vs solo, structured vs fluid, big-picture vs detail-oriented..."
        initialContent={arrayToMarkdownList(profile.workStylePreferences)}
        onSave={(md) => setProfileFields({ workStylePreferences: markdownListToArray(md) })}
      />

      {/* Core Values — TipTap bullet list */}
      <SectionEditModal
        opened={editingSection === "values"}
        onClose={closeModal}
        title="Core Values"
        explanation="Your non-negotiables — what matters most to you at work."
        initialContent={arrayToMarkdownList(profile.values)}
        onSave={(md) => setProfileFields({ values: markdownListToArray(md) })}
      />

      {/* Risk & Adaptability — Select + TipTap editors */}
      <RiskEditModal
        opened={editingSection === "risk"}
        onClose={closeModal}
        initial={{
          riskAppetite: profile.riskAppetite ?? "unknown",
          riskProfileDetails: profile.riskProfileDetails ?? "",
          changeToleranceNotes: profile.changeToleranceNotes ?? "",
        }}
        onSave={(data) => setProfileFields(data)}
      />

      {/* Coach Notes — TipTap free text */}
      <SectionEditModal
        opened={editingSection === "notes"}
        onClose={closeModal}
        title="Coach Notes"
        explanation="Raw insights and observations from your profile coaching sessions."
        initialContent={profile.rawInsights ?? ""}
        onSave={(md) => setProfileFields({ rawInsights: md })}
      />
    </Box>
  );
}

// ── Markdown list helpers ─────────────────────────────────────────────────

/** Convert a string array to a markdown bullet list for TipTap editing. */
function arrayToMarkdownList(items?: string[]): string {
  if (!items || items.length === 0) return "";
  return items.map((item) => `- ${item}`).join("\n");
}

/** Parse a markdown bullet list back to a string array, skipping empty/placeholder items. */
function markdownListToArray(md: string): string[] {
  const items: string[] = [];
  for (const line of md.split("\n")) {
    const trimmed = line.trim();
    // Match "- item" or "* item" bullet syntax
    const match = trimmed.match(/^[-*]\s+(.+)/);
    if (match) {
      const val = match[1].trim();
      // Skip Mantine placeholder hints and empty strings
      if (val && !val.startsWith("*(") && val.length > 0) {
        items.push(val);
      }
    } else if (trimmed.length > 0 && !trimmed.startsWith("#")) {
      // Non-bullet, non-heading line — treat as a standalone item
      items.push(trimmed);
    }
  }
  return items;
}

// src/components/editors/ResumeEditor.tsx
// ---------------------------------------------------------------------------
// Resume editor — two-column layout: section cards on the left,
// Resume Coach chat on the right. Each section has an edit button that
// opens a modal for structured editing. Experience section redirects to
// the experience page. The chat agent helps build a complete reference
// resume (not tailored to any specific job).
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useViewportSize, useElementSize } from "@mantine/hooks";
import {
  Group,
  Grid,
  ScrollArea,
  Box,
  Text,
  Divider,
  ThemeIcon,
} from "@mantine/core";
import { MdArticle } from "react-icons/md";
import { useCareerStore } from "../../stores/careerStore";
import { ResumeDisplay } from "./ResumeDisplay";
import type { EditResumeSection } from "./ResumeDisplay";
import { CoachChatPanel } from "../chat/CoachChatPanel";
import { ResumeKeySkillsModal } from "./ResumeKeySkillsModal";
import { ResumePersonalInfoModal } from "./ResumePersonalInfoModal";
import { ResumeHighlightsModal } from "./ResumeHighlightsModal";
import { ResumeEducationModal } from "./ResumeEducationModal";
import { ResumeLanguagesModal } from "./ResumeLanguagesModal";
import { useLayoutStore } from "../../stores/layoutStore";

export function ResumeEditor() {
  const resumeData = useCareerStore((s) => s.resumeData);
  const setResumeFields = useCareerStore((s) => s.setResumeFields);
  const navigate = useNavigate();

  // ── Modal state ────────────────────────────────────────────────────
  const [editingSection, setEditingSection] = useState<EditResumeSection | null>(null);

  const openModal = useCallback((section: EditResumeSection) => {
    setEditingSection(section);
  }, []);

  const closeModal = useCallback(() => {
    setEditingSection(null);
  }, []);

  const handleEditExperience = useCallback(() => {
    void navigate("/experience");
  }, [navigate]);

  // ── Layout ────────────────────────────────────────────────────────
  const appHeaderHeight = useLayoutStore((s) => s.appHeaderHeight);
  const { height: viewportH } = useViewportSize();
  const { ref: headerRef, height: headerH } = useElementSize({ box: "border-box" });
  const colH = `calc(${viewportH}px - ${appHeaderHeight}px)`;

  return (
    <Box h="100%" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Grid h={colH} gap={0}>
        {/* ── Left: Resume section display ────────────────────────── */}
        <Grid.Col span={6}>
          <Box ref={headerRef}>
            <Group p="md">
              <ThemeIcon color="resume.4" variant="transparent">
                <MdArticle size={20} />
              </ThemeIcon>
              <Text>Build your reference resume with our AI assistant</Text>
            </Group>
            <Divider />
          </Box>
          <ScrollArea h={`calc(${colH} - ${headerH}px)`} scrollbarSize={8}>
            <ResumeDisplay onEditSection={openModal} onEditExperience={handleEditExperience} />
          </ScrollArea>
        </Grid.Col>

        {/* ── Right: Resume Coach chat ────────────────────────────── */}
        <Grid.Col span={6}>
          <Box h="100%" style={{ display: "flex", alignItems: "stretch" }}>
            <Divider orientation="vertical" />
            <Box style={{ flex: 1 }}>
              <CoachChatPanel
                coachType="resume"
                emptyStateText="Your profile and experiences are ready. Your Resume Coach will help you build a complete reference resume covering personal info, highlights, skills, education, and languages."
                placeholder="Tell your Resume Coach about your skills, education, or background..."
                forceAgent="resume"
                colH={colH}
              />
            </Box>
          </Box>
        </Grid.Col>
      </Grid>

      {/* ── Edit Modals ──────────────────────────────────────────────── */}

      {/* Personal Information — structured form fields */}
      <ResumePersonalInfoModal
        opened={editingSection === "personalInfo"}
        onClose={closeModal}
        initial={{
          firstName: resumeData.firstName,
          lastName: resumeData.lastName,
          phone: resumeData.phone,
          email: resumeData.email,
          linkedin: resumeData.linkedin,
          otherNetworks: resumeData.otherNetworks,
          nationality: resumeData.nationality,
          country: resumeData.country,
        }}
        onSave={(data) => setResumeFields(data)}
      />

      {/* Highlights — title + banner oneliner */}
      <ResumeHighlightsModal
        opened={editingSection === "highlights"}
        onClose={closeModal}
        initial={{
          title: resumeData.title,
          bannerHighlights: resumeData.bannerHighlights,
        }}
        onSave={(data) => setResumeFields(data)}
      />

      {/* Key Skills — structured editor with categories */}
      <ResumeKeySkillsModal
        opened={editingSection === "keySkills"}
        onClose={closeModal}
        initial={resumeData.keySkills}
        onSave={(skills) => setResumeFields({ keySkills: skills })}
      />

      {/* Education — structured entries */}
      <ResumeEducationModal
        opened={editingSection === "education"}
        onClose={closeModal}
        initial={resumeData.education}
        onSave={(data) => setResumeFields({ education: data })}
      />

      {/* Languages — structured entries */}
      <ResumeLanguagesModal
        opened={editingSection === "languages"}
        onClose={closeModal}
        initial={resumeData.languages}
        onSave={(data) => setResumeFields({ languages: data })}
      />
    </Box>
  );
}

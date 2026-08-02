// src/renderer/components/editors/ResumeDisplay.tsx
// ---------------------------------------------------------------------------
// Composes all resume section displays from the career store's structured
// resume data. Each section shows rendered content (or a placeholder) with
// an edit button that notifies the parent which section to open via modal.
// The Experience section redirects to the experience page.
// ---------------------------------------------------------------------------

import { Stack, Text, List, Box } from "@mantine/core";
import { TiArrowForward } from "react-icons/ti";
import { useCareerStore } from "../../stores/careerStore";
import { ProfileSectionDisplay } from "./ProfileSectionDisplay";
import type { ResumeData, Skill } from "../../../shared/state";
import { groupSkillsByCategory, SKILL_CATEGORIES } from "../../../shared/state";

export type EditResumeSection =
  | "personalInfo"
  | "highlights"
  | "keySkills"
  | "education"
  | "languages";

export interface ResumeDisplayProps {
  onEditSection: (section: EditResumeSection) => void;
  onEditExperience: () => void;
}

const EMPTY_RESUME: ResumeData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  linkedin: "",
  otherNetworks: "",
  nationality: "",
  country: "",
  title: "",
  bannerHighlights: "",
  keySkills: [],
  education: [],
  languages: [],
};

export function ResumeDisplay({ onEditSection, onEditExperience }: ResumeDisplayProps) {
  const resumeData = useCareerStore((s) => s.resumeData) ?? EMPTY_RESUME;

  const fullName = [resumeData.firstName, resumeData.lastName].filter(Boolean).join(" ") || null;
  const hasContact =
    resumeData.email || resumeData.phone || resumeData.linkedin || resumeData.otherNetworks;

  return (
    <Stack gap={0}>
      {/* ── Personal Information ────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Personal Information"
        placeholder="Your name, contact details, nationality, and location."
        onEdit={() => onEditSection("personalInfo")}
      >
        <List>
          {fullName && (
            <List.Item>
              <Text size="sm">
                <strong>Name:</strong> {fullName}
              </Text>
            </List.Item>
          )}
          {hasContact && (
            <List.Item>
              <Text size="sm">
                <strong>Contact:</strong>{" "}
                {[resumeData.email, resumeData.phone, resumeData.linkedin, resumeData.otherNetworks]
                  .filter(Boolean)
                  .join(" | ")}
              </Text>
            </List.Item>
          )}
          {resumeData.nationality && (
            <List.Item>
              <Text size="sm">
                <strong>Nationality:</strong> {resumeData.nationality}
              </Text>
            </List.Item>
          )}
          {resumeData.country && (
            <List.Item>
              <Text size="sm">
                <strong>Country:</strong> {resumeData.country}
              </Text>
            </List.Item>
          )}
        </List>
      </ProfileSectionDisplay>

      {/* ── Highlights ──────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Highlights"
        placeholder="Your professional title and a one-line key highlights banner."
        onEdit={() => onEditSection("highlights")}
      >
        {resumeData.title && (
          <Text size="sm">
            <strong>Title:</strong> {resumeData.title}
          </Text>
        )}
        {resumeData.bannerHighlights && (
          <Text size="sm" fs="italic">
            {resumeData.bannerHighlights}
          </Text>
        )}
      </ProfileSectionDisplay>

      {/* ── Experience (redirects to experience page) ───────────── */}
      <ProfileSectionDisplay
        title="Experience"
        placeholder="Work experiences are managed on the Experience page. Click to go there."
        onEdit={onEditExperience}
        icon={TiArrowForward}
      >
        <Text size="sm" c="dimmed">
          Managed on the Experience page — click to navigate.
        </Text>
      </ProfileSectionDisplay>

      {/* ── Key Skills ──────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Key Skills"
        placeholder="Your complete skill inventory — hard skills, soft skills, tools, certifications."
        onEdit={() => onEditSection("keySkills")}
      >
        <SkillGroupedDisplay skills={resumeData.keySkills} />
      </ProfileSectionDisplay>

      {/* ── Education ────────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Education"
        placeholder="Degrees, certifications, and significant training."
        onEdit={() => onEditSection("education")}
      >
        {resumeData.education.length > 0 ? (
          <List spacing={4} size="sm">
            {resumeData.education.map((edu) => (
              <List.Item key={edu.id}>
                <strong>
                  {edu.degree} in {edu.field}
                </strong>{" "}
                — {edu.institution} ({edu.startDate}–{edu.endDate})
              </List.Item>
            ))}
          </List>
        ) : null}
      </ProfileSectionDisplay>

      {/* ── Languages ────────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Languages"
        placeholder="Languages you speak and your proficiency level."
        onEdit={() => onEditSection("languages")}
      >
        {resumeData.languages.length > 0 ? (
          <List spacing={4} size="sm">
            {resumeData.languages.map((lang) => (
              <List.Item key={lang.id}>
                {lang.language} — {lang.proficiency}
              </List.Item>
            ))}
          </List>
        ) : null}
      </ProfileSectionDisplay>
    </Stack>
  );
}

function SkillGroupedDisplay({ skills }: { skills: Skill[] }) {
  const grouped = groupSkillsByCategory(skills);
  const hasAny = SKILL_CATEGORIES.some((cat) => (grouped.get(cat) ?? []).length > 0);
  if (!hasAny) return null;

  return (
    <Stack gap="xs">
      {SKILL_CATEGORIES.map((cat) => {
        const items = grouped.get(cat) ?? [];
        if (items.length === 0) return null;
        return (
          <Box key={cat}>
            <Text size="xs" tt="capitalize" fw={600} c="dimmed">
              {cat}:
            </Text>
            <Text size="sm">{items.map((s) => s.name).join(", ")}</Text>
          </Box>
        );
      })}
    </Stack>
  );
}

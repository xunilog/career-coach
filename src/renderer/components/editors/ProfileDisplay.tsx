// src/renderer/components/editors/ProfileDisplay.tsx
// ---------------------------------------------------------------------------
// Composes all profile section displays from the career store's structured
// profile data. Each section shows rendered content (or a placeholder) with
// an edit button that notifies the parent which section to open via modal.
// ---------------------------------------------------------------------------

import { Stack, Text, Badge, List } from "@mantine/core";
import { useCareerStore } from "../../stores/careerStore";
import { ProfileSectionDisplay } from "./ProfileSectionDisplay";
import type { ColorProfile } from "../../../shared/state";

const COLOR_LABELS: Record<string, string> = {
  Red: "🔴 Red",
  Yellow: "🟡 Yellow",
  Green: "🟢 Green",
  Blue: "🔵 Blue",
  unknown: "❓ Unknown",
};

export type EditSection = "colors" | "drivers" | "workStyle" | "values" | "risk" | "notes";

export interface ProfileDisplayProps {
  onEditSection: (section: EditSection) => void;
}

export function ProfileDisplay({ onEditSection }: ProfileDisplayProps) {
  const profile = useCareerStore((s) => s.profile);

  return (
    <Stack gap={0}>
      {/* ── Colors Profile ────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Colors Profile"
        placeholder="Your Colors profile hasn't been discovered yet. Talk to the Profile Coach to discover it."
        onEdit={() => onEditSection("colors")}
      >
        <ColorsContent profile={profile} />
      </ProfileSectionDisplay>

      {/* ── Career Drivers ────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Career Drivers"
        placeholder="What energises you at work? Autonomy, impact, recognition, security, growth, variety..."
        onEdit={() => onEditSection("drivers")}
      >
        <BulletList items={profile.careerDrivers} />
      </ProfileSectionDisplay>

      {/* ── Work Style Preferences ────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Work Style Preferences"
        placeholder="Collaborative vs solo, structured vs fluid, big-picture vs detail-oriented..."
        onEdit={() => onEditSection("workStyle")}
      >
        <BulletList items={profile.workStylePreferences} />
      </ProfileSectionDisplay>

      {/* ── Core Values ───────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Core Values"
        placeholder="Your non-negotiables — what matters most at work."
        onEdit={() => onEditSection("values")}
      >
        <BulletList items={profile.values} />
      </ProfileSectionDisplay>

      {/* ── Risk & Adaptability ───────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Risk & Adaptability"
        placeholder="Your risk tolerance and how you handle change haven't been assessed yet."
        onEdit={() => onEditSection("risk")}
      >
        <RiskContent profile={profile} />
      </ProfileSectionDisplay>

      {/* ── Coach Notes ───────────────────────────────────────────── */}
      <ProfileSectionDisplay
        title="Coach Notes"
        placeholder="Raw insights from your profile coaching sessions will appear here."
        onEdit={() => onEditSection("notes")}
      >
        {profile.rawInsights ? (
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {profile.rawInsights}
          </Text>
        ) : null}
      </ProfileSectionDisplay>
    </Stack>
  );
}

// ── Sub-renderers ──────────────────────────────────────────────────────────

function ColorsContent({ profile }: { profile: Partial<ColorProfile> }) {
  const hasAny =
    (profile.dominantColor && profile.dominantColor !== "unknown") ||
    profile.secondaryColor ||
    profile.discProfile;

  if (!hasAny) return null;

  return (
    <List spacing={4} size="sm">
      {profile.dominantColor && profile.dominantColor !== "unknown" && (
        <List.Item>
          <Text size="sm">
            <strong>Dominant:</strong>{" "}
            {COLOR_LABELS[profile.dominantColor] ?? profile.dominantColor}
          </Text>
        </List.Item>
      )}
      {profile.secondaryColor && (
        <List.Item>
          <Text size="sm">
            <strong>Secondary:</strong>{" "}
            {COLOR_LABELS[profile.secondaryColor] ?? profile.secondaryColor}
          </Text>
        </List.Item>
      )}
      {profile.discProfile && (
        <List.Item>
          <Text size="sm">
            <strong>DISC:</strong> {profile.discProfile}
          </Text>
        </List.Item>
      )}
    </List>
  );
}

function RiskContent({ profile }: { profile: Partial<ColorProfile> }) {
  const hasRisk = profile.riskAppetite && profile.riskAppetite !== "unknown";
  const hasDetails = !!profile.riskProfileDetails?.trim();
  const hasChange = !!profile.changeToleranceNotes?.trim();

  if (!hasRisk && !hasDetails && !hasChange) return null;

  return (
    <>
      {hasRisk && (
        <Badge color={riskColor(profile.riskAppetite!)} variant="light" mb="xs">
          {profile.riskAppetite!.charAt(0).toUpperCase() + profile.riskAppetite!.slice(1)} Risk
        </Badge>
      )}
      {hasDetails && (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {profile.riskProfileDetails}
        </Text>
      )}
      {hasChange && (
        <>
          <Text size="sm" fw={500} mt="xs">
            Change Tolerance
          </Text>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {profile.changeToleranceNotes}
          </Text>
        </>
      )}
    </>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <List spacing={4} size="sm">
      {items.map((item, i) => (
        <List.Item key={i}>{item}</List.Item>
      ))}
    </List>
  );
}

function riskColor(level: string): string {
  switch (level) {
    case "low":
      return "green";
    case "medium":
      return "yellow";
    case "high":
      return "red";
    default:
      return "gray";
  }
}

// src/renderer/components/editors/ExperienceCard.tsx
// ---------------------------------------------------------------------------
// Compact card displaying a single experience entry. Shows title, company
// (bold), date range, sector as a colour-coded Badge, and an edit button.
// ---------------------------------------------------------------------------

import { Paper, Group, Badge, ActionIcon, Text } from "@mantine/core";
import { MdEdit } from "react-icons/md";
import type { Experience } from "../../../shared/state";
import { useState } from "react";

// ── Sector colour mapping ──────────────────────────────────────────────────

/**
 * Returns a Mantine colour name for a given sector string.
 * Matches common keywords; falls back to "gray" for unknown sectors.
 */
function sectorColor(sector: string): string {
  const s = sector.toLowerCase();
  if (/tech|software|it\b|information/.test(s)) return "blue";
  if (/financ|bank|invest|insur/.test(s)) return "green";
  if (/health|medic|pharma|biotech/.test(s)) return "teal";
  if (/educat|teach|academ|university/.test(s)) return "violet";
  if (/retail|ecommerce|e-commerce/.test(s)) return "orange";
  if (/manufactur|industr|engineer/.test(s)) return "grape";
  if (/consult|advisory|professional/.test(s)) return "cyan";
  if (/govern|public|nonprofit|ngo/.test(s)) return "red";
  if (/market|advertis|media|publish/.test(s)) return "pink";
  if (/energy|oil|gas|utilit/.test(s)) return "yellow";
  if (/transport|logistic|aviation/.test(s)) return "indigo";
  if (/legal|law/.test(s)) return "lime";
  return "gray";
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface ExperienceCardProps {
  experience: Experience;
  onEdit: () => void;
}

// ── Format helpers ─────────────────────────────────────────────────────────

function formatDate(date: string): string {
  if (!date) return "—";
  if (date === "present") return "Present";
  return date;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ExperienceCard({ experience, onEdit }: ExperienceCardProps) {
  const dateRange = `${formatDate(experience.startDate)} – ${formatDate(experience.endDate)}`;
  const [showBorder, setShowBorder] = useState(false);

  return (
    <Paper
      withBorder
      onClick={onEdit}
      mx="xs"
      p="sm"
      radius={0}
      style={{ border: showBorder ? "2px solid #ccc" : "2px solid transparent" }}
      onMouseOver={() => setShowBorder(true)}
      onMouseOut={() => setShowBorder(false)}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title line */}
          <Text size="sm" lineClamp={1}>
            {experience.title || "Untitled Role"}
          </Text>
          {/* Company + Sector badge */}
          <Group gap="xs" mt={2} align="center" wrap="nowrap">
            <Text fw={700} size="sm" lineClamp={1}>
              {experience.company || "No company"}
            </Text>
            {experience.sector && experience.sector !== "unknown" && (
              <Badge size="xs" color={sectorColor(experience.sector)} variant="light">
                {experience.sector}
              </Badge>
            )}
          </Group>
          {/* Date range */}
          <Text size="xs" c="dimmed" mt={2}>
            {dateRange}
          </Text>
        </div>
        <ActionIcon variant="subtle" color="gray" aria-label="Edit experience">
          <MdEdit size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}

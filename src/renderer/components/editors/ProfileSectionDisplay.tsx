// src/renderer/components/editors/ProfileSectionDisplay.tsx
// ---------------------------------------------------------------------------
// Reusable section card for the profile display — shows a section title,
// rendered content (or a dimmed placeholder when empty), and an edit button.
// ---------------------------------------------------------------------------

import { Paper, Group, Title, ActionIcon, Text, Box } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { MdModeEdit } from "react-icons/md";
import type { IconType } from "react-icons";

export interface ProfileSectionDisplayProps {
  title: string;
  children: ReactNode;
  placeholder: string;
  onEdit: () => void;
  icon?: IconType;
}

export function ProfileSectionDisplay({
  title,
  children,
  placeholder,
  onEdit,
  icon: Icon = MdModeEdit,
}: ProfileSectionDisplayProps) {
  const isEmpty = !hasContent(children);
  const [showBorder, setShowBorder] = useState(false);

  return (
    <Paper
      onMouseOver={() => setShowBorder(true)}
      onMouseOut={() => setShowBorder(false)}
      withBorder
      style={{ border: showBorder ? "2px solid #ccc" : "2px solid transparent" }}
      p={0}
      radius={0}
      mx="xs"
      px="sm"
      onClick={onEdit}
    >
      <Group justify="space-between" mb="xs">
        <Title order={5}>{title}</Title>
        <ActionIcon variant="subtle" color="gray" aria-label={`Edit ${title}`}>
          <Icon />
        </ActionIcon>
      </Group>
      <Box>
        {isEmpty ? (
          <Text c="dimmed" fs="italic" size="sm">
            {placeholder}
          </Text>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}

/**
 * Returns false when children is a React fragment/array with all empty/null elements,
 * or when it's null/undefined/empty string.
 */
function hasContent(children: ReactNode): boolean {
  if (children === null || children === undefined) return false;
  if (typeof children === "string") return children.trim().length > 0;
  if (typeof children === "boolean") return false;
  if (typeof children === "number") return true;
  if (Array.isArray(children)) return children.some((c) => hasContent(c));
  return true;
}

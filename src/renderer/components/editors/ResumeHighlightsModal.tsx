// src/renderer/components/editors/ResumeHighlightsModal.tsx
// ---------------------------------------------------------------------------
// Modal for editing the highlights section of the reference resume.
// Title + banner key highlights oneliner.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { TextInput, Textarea, Button, Group, Text } from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import type { ResumeData } from "../../../shared/state";

interface ResumeHighlightsModalProps {
  opened: boolean;
  onClose: () => void;
  initial: Pick<ResumeData, "title" | "bannerHighlights">;
  onSave: (data: Pick<ResumeData, "title" | "bannerHighlights">) => void;
}

export function ResumeHighlightsModal({
  opened,
  onClose,
  initial,
  onSave,
}: ResumeHighlightsModalProps) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [bannerHighlights, setBannerHighlights] = useState(initial.bannerHighlights ?? "");

  // Reset form when modal opens with new initial values
  const [lastOpened, setLastOpened] = useState(false);
  if (opened && !lastOpened) {
    setTitle(initial.title ?? "");
    setBannerHighlights(initial.bannerHighlights ?? "");
    setLastOpened(true);
  }
  if (!opened && lastOpened) {
    setLastOpened(false);
  }

  const handleSave = useCallback(() => {
    onSave({ title, bannerHighlights });
    onClose();
  }, [title, bannerHighlights, onSave, onClose]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Highlights"
      footer={
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleSave}>
            Save
          </Button>
        </Group>
      }
    >
      <Text size="sm" c="dimmed" mb="md">
        Your professional headline and a one-line banner that captures your value proposition. This
        is the first thing recruiters see.
      </Text>

      <TextInput
        label="Professional Title"
        placeholder="Senior Product Manager"
        description="How you want to be known professionally."
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
      />

      <Textarea
        label="Key Highlights Banner"
        placeholder="10 years in B2B SaaS, launched 3 products from 0 to $10M ARR"
        description="One punchy line summarising your career highlights."
        mt="sm"
        minRows={2}
        maxRows={4}
        autosize
        value={bannerHighlights}
        onChange={(e) => setBannerHighlights(e.currentTarget.value)}
      />
    </AppModal>
  );
}

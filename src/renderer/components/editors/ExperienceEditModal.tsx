// src/renderer/components/editors/ExperienceEditModal.tsx
// ---------------------------------------------------------------------------
// Full structured modal for editing a single Experience entry. All fields
// are exposed: text inputs, number inputs, checkbox group for RACI roles,
// minimal TipTap editors for list-based fields, and textareas for free text.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import {
  TextInput,
  NumberInput,
  Textarea,
  Checkbox,
  Button,
  Group,
  Text,
  Stack,
  SimpleGrid,
} from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import { MonthPickerInput } from "@mantine/dates";
import type { Experience, RACIRole } from "../../../shared/state";
import { MinimalTipTapEditor } from "./MinimalTipTapEditor";
import { SkillListEditor } from "./SkillListEditor";
import type { Skill } from "../../../shared/state";
import { ask } from "@tauri-apps/plugin-dialog";

// ── Helpers ─────────────────────────────────────────────────────────────────

function markdownToList(md: string): string[] {
  const items: string[] = [];
  for (const line of md.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/^[-*]\s+(.+)/);
    if (match) {
      const val = match[1].trim();
      if (val && val.length > 0) items.push(val);
    } else if (trimmed.length > 0 && !trimmed.startsWith("#")) {
      items.push(trimmed);
    }
  }
  return items;
}

function listToMarkdown(items: string[]): string {
  if (!items || items.length === 0) return "";
  return items.map((item) => `- ${item}`).join("\n");
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ExperienceEditModalProps {
  opened: boolean;
  onClose: () => void;
  experience: Experience;
  onSave: (experience: Experience) => void;
  onDelete: (id: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function ExperienceEditModal({
  opened,
  onClose,
  experience,
  onSave,
  onDelete,
}: ExperienceEditModalProps) {
  // ── Form state ──────────────────────────────────────────────────────────
  const [company, setCompany] = useState(experience.company);
  const [title, setTitle] = useState(experience.title);
  const [sector, setSector] = useState(experience.sector);
  const [startDate, setStartDate] = useState(experience.startDate);
  const [endDate, setEndDate] = useState(
    experience.endDate === "present" ? "present" : experience.endDate,
  );
  const [isCurrent, setIsCurrent] = useState(experience.endDate === "present");
  const [budgetManaged, setBudgetManaged] = useState(experience.budgetManaged ?? "");
  const [teamSize, setTeamSize] = useState<number | "">(experience.teamSize ?? "");
  const [directReports, setDirectReports] = useState<number | "">(experience.directReports ?? "");
  const [raciRoles, setRaciRoles] = useState<RACIRole[]>(experience.raciRoles);
  const [keyProjects, setKeyProjects] = useState(listToMarkdown(experience.keyProjects));
  const [quantifiedAchievements, setQuantifiedAchievements] = useState(
    listToMarkdown(experience.quantifiedAchievements),
  );
  const [skillsArray, setSkillsArray] = useState<Skill[]>(experience.skillsDemonstrated);
  const [challenges, setChallenges] = useState(experience.challenges);
  const [reasonForLeaving, setReasonForLeaving] = useState(experience.reasonForLeaving ?? "");
  const [rawNotes, setRawNotes] = useState(experience.rawNotes);

  // ── Reset form when modal opens with a new experience ───────────────────
  const [lastOpened, setLastOpened] = useState(false);
  if (opened && !lastOpened) {
    setCompany(experience.company);
    setTitle(experience.title);
    setSector(experience.sector);
    setStartDate(experience.startDate);
    setEndDate(experience.endDate === "present" ? "present" : experience.endDate);
    setIsCurrent(experience.endDate === "present");
    setBudgetManaged(experience.budgetManaged ?? "");
    setTeamSize(experience.teamSize ?? "");
    setDirectReports(experience.directReports ?? "");
    setRaciRoles(experience.raciRoles);
    setKeyProjects(listToMarkdown(experience.keyProjects));
    setQuantifiedAchievements(listToMarkdown(experience.quantifiedAchievements));
    setSkillsArray(experience.skillsDemonstrated);
    setChallenges(experience.challenges);
    setReasonForLeaving(experience.reasonForLeaving ?? "");
    setRawNotes(experience.rawNotes);
    setLastOpened(true);
  }
  if (!opened && lastOpened) {
    setLastOpened(false);
  }

  // ── RACI checkbox handler ───────────────────────────────────────────────
  const handleRaciChange = useCallback((values: string[]) => {
    setRaciRoles(values as RACIRole[]);
  }, []);

  // ── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    const confirmed = await ask("Delete this experience?", {
      title: "Delete Experience",
      kind: "warning",
    });
    if (!confirmed) return;
    onDelete(experience.id);
    onClose();
  }, [experience.id, onDelete, onClose]);

  // ── Save handler ────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    onSave({
      id: experience.id,
      company,
      title,
      startDate,
      endDate: endDate || "present",
      sector,
      teamSize: teamSize === "" ? undefined : Number(teamSize),
      budgetManaged: budgetManaged || undefined,
      directReports: directReports === "" ? undefined : Number(directReports),
      raciRoles,
      keyProjects: markdownToList(keyProjects),
      quantifiedAchievements: markdownToList(quantifiedAchievements),
      skillsDemonstrated: skillsArray,
      challenges,
      reasonForLeaving: reasonForLeaving || undefined,
      rawNotes,
    });
    onClose();
  }, [
    experience.id,
    company,
    title,
    startDate,
    endDate,
    sector,
    teamSize,
    budgetManaged,
    directReports,
    raciRoles,
    keyProjects,
    quantifiedAchievements,
    skillsArray,
    challenges,
    reasonForLeaving,
    rawNotes,
    onSave,
    onClose,
  ]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Edit Experience"
      size="xl"
      footer={
        <Group justify="space-between" w="100%">
          <Button color="red" variant="outline" onClick={handleDelete}>
            Delete Experience
          </Button>
          <Group>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="filled" onClick={handleSave}>
              Save
            </Button>
          </Group>
        </Group>
      }
    >
      <Stack gap="lg" p="xs">
        {/* ── Basic Info ───────────────────────────────────────────── */}
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed" tt="uppercase">
            Basic Info
          </Text>
          <SimpleGrid cols={2}>
            <TextInput
              label="Company"
              value={company}
              onChange={(e) => setCompany(e.currentTarget.value)}
              required
              placeholder="e.g., Acme Corp"
            />
            <TextInput
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              required
              placeholder="e.g., Senior Software Engineer"
            />
            <TextInput
              label="Sector"
              value={sector}
              onChange={(e) => setSector(e.currentTarget.value)}
              placeholder="e.g., Tech, Finance, Healthcare..."
            />
            <TextInput
              label="Budget Managed"
              value={budgetManaged}
              onChange={(e) => setBudgetManaged(e.currentTarget.value)}
              placeholder="e.g., €2M opex"
            />
            <MonthPickerInput
              label="Start Date"
              value={startDate || null}
              onChange={(d) => setStartDate(d ?? "")}
              valueFormat="YYYY-MM"
              placeholder="Pick a month"
              clearable
            />
            <Stack gap="xs">
              <MonthPickerInput
                label="End Date"
                value={isCurrent ? null : endDate || null}
                onChange={(d) => setEndDate(d ?? "")}
                valueFormat="YYYY-MM"
                placeholder="Pick a month"
                clearable
                disabled={isCurrent}
              />
              <Checkbox
                label="I currently work here"
                checked={isCurrent}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setIsCurrent(checked);
                  if (checked) {
                    setEndDate("present");
                  } else {
                    setEndDate("");
                  }
                }}
              />
            </Stack>
          </SimpleGrid>
        </Stack>

        {/* ── Role Details ─────────────────────────────────────────── */}
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed" tt="uppercase">
            Role Details
          </Text>
          <SimpleGrid cols={2}>
            <NumberInput
              label="Team Size"
              value={teamSize}
              onChange={(v) => setTeamSize(v === "" ? "" : Number(v))}
              placeholder="e.g., 5"
              min={0}
            />
            <NumberInput
              label="Direct Reports"
              value={directReports}
              onChange={(v) => setDirectReports(v === "" ? "" : Number(v))}
              placeholder="e.g., 3"
              min={0}
            />
          </SimpleGrid>
        </Stack>

        {/* ── RACI Roles ───────────────────────────────────────────── */}
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed" tt="uppercase">
            RACI Roles
          </Text>
          <Checkbox.Group value={raciRoles} onChange={handleRaciChange}>
            <Group>
              <Checkbox value="Responsible" label="Responsible" />
              <Checkbox value="Accountable" label="Accountable" />
              <Checkbox value="Consulted" label="Consulted" />
              <Checkbox value="Informed" label="Informed" />
            </Group>
          </Checkbox.Group>
        </Stack>

        {/* ── Content — list-based fields with TipTap ───────────────── */}
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed" tt="uppercase">
            Content
          </Text>

          <Text size="xs" fw={500}>
            Key Projects
          </Text>
          <MinimalTipTapEditor
            content={keyProjects}
            onChange={setKeyProjects}
            placeholder="- Led migration to microservices..."
          />

          <Text size="xs" fw={500}>
            Quantified Achievements
          </Text>
          <MinimalTipTapEditor
            content={quantifiedAchievements}
            onChange={setQuantifiedAchievements}
            placeholder="- Reduced latency by 40%..."
          />

          <SkillListEditor
            skills={skillsArray}
            onChange={setSkillsArray}
            label="Skills Demonstrated"
            placeholder="e.g., TypeScript"
          />
        </Stack>

        {/* ── Textareas ────────────────────────────────────────────── */}
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed" tt="uppercase">
            Details
          </Text>
          <Textarea
            label="Challenges"
            value={challenges}
            onChange={(e) => setChallenges(e.currentTarget.value)}
            placeholder="Describe challenges faced in this role..."
            minRows={3}
            autosize
          />
          <Textarea
            label="Reason for Leaving"
            value={reasonForLeaving}
            onChange={(e) => setReasonForLeaving(e.currentTarget.value)}
            placeholder="e.g., Seeking new challenges, company restructured..."
            minRows={2}
            autosize
          />
          <Textarea
            label="Raw Notes"
            value={rawNotes}
            onChange={(e) => setRawNotes(e.currentTarget.value)}
            placeholder="Any additional notes..."
            minRows={3}
            autosize
          />
        </Stack>
      </Stack>
    </AppModal>
  );
}

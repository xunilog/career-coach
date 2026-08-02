// src/renderer/components/search/SearchModal.tsx
// ---------------------------------------------------------------------------
// Two-tier form (simple + advanced collapsible) for creating/editing searches.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import {
  TextInput,
  Select,
  Button,
  Stack,
  Collapse,
  Group,
  NumberInput,
  MultiSelect,
} from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import { MdExpandMore, MdChevronRight } from "react-icons/md";
import { ask } from "@tauri-apps/plugin-dialog";
import { useJobSearchStore } from "../../stores/jobSearchStore";
import {
  useCreateSearch,
  useUpdateSearch,
  useDeleteSearch,
  useCheckDuplicate,
  useSearch,
} from "../../hooks/useSearchQueries";
import type { SearchInput, SearchFilters, Schedule } from "../../../shared/types";

const SCHEDULE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const WORKPLACE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];

const COMMITMENT_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const SENIORITY_OPTIONS = [
  { value: "Entry Level", label: "Entry Level" },
  { value: "Mid Level", label: "Mid Level" },
  { value: "Senior", label: "Senior" },
  { value: "Lead", label: "Lead" },
  { value: "Director", label: "Director" },
  { value: "VP", label: "VP" },
  { value: "C-Level", label: "C-Level" },
];

const COUNTRY_OPTIONS = [
  { value: "usa", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
  { value: "belgium", label: "Belgium" },
  { value: "netherlands", label: "Netherlands" },
  { value: "canada", label: "Canada" },
  { value: "australia", label: "Australia" },
  { value: "switzerland", label: "Switzerland" },
  { value: "sweden", label: "Sweden" },
  { value: "spain", label: "Spain" },
  { value: "italy", label: "Italy" },
  { value: "ireland", label: "Ireland" },
  { value: "india", label: "India" },
  { value: "brazil", label: "Brazil" },
  { value: "mexico", label: "Mexico" },
  { value: "japan", label: "Japan" },
  { value: "singapore", label: "Singapore" },
  { value: "poland", label: "Poland" },
  { value: "portugal", label: "Portugal" },
  { value: "denmark", label: "Denmark" },
  { value: "norway", label: "Norway" },
  { value: "finland", label: "Finland" },
  { value: "austria", label: "Austria" },
  { value: "luxembourg", label: "Luxembourg" },
  { value: "romania", label: "Romania" },
  { value: "croatia", label: "Croatia" },
  { value: "slovenia", label: "Slovenia" },
  { value: "slovakia", label: "Slovakia" },
  { value: "czechrepublic", label: "Czech Republic" },
  { value: "hungary", label: "Hungary" },
  { value: "greece", label: "Greece" },
  { value: "turkey", label: "Turkey" },
  { value: "israel", label: "Israel" },
  { value: "unitedarabemirates", label: "United Arab Emirates" },
  { value: "qatar", label: "Qatar" },
  { value: "saudiarabia", label: "Saudi Arabia" },
  { value: "southafrica", label: "South Africa" },
  { value: "nigeria", label: "Nigeria" },
  { value: "egypt", label: "Egypt" },
  { value: "morocco", label: "Morocco" },
  { value: "southkorea", label: "South Korea" },
  { value: "taiwan", label: "Taiwan" },
  { value: "china", label: "China" },
  { value: "hongkong", label: "Hong Kong" },
  { value: "thailand", label: "Thailand" },
  { value: "vietnam", label: "Vietnam" },
  { value: "indonesia", label: "Indonesia" },
  { value: "malaysia", label: "Malaysia" },
  { value: "philippines", label: "Philippines" },
  { value: "pakistan", label: "Pakistan" },
  { value: "bangladesh", label: "Bangladesh" },
  { value: "newzealand", label: "New Zealand" },
  { value: "argentina", label: "Argentina" },
  { value: "chile", label: "Chile" },
  { value: "colombia", label: "Colombia" },
  { value: "peru", label: "Peru" },
  { value: "ecuador", label: "Ecuador" },
  { value: "venezuela", label: "Venezuela" },
  { value: "uruguay", label: "Uruguay" },
  { value: "panama", label: "Panama" },
  { value: "costarica", label: "Costa Rica" },
  { value: "kuwait", label: "Kuwait" },
  { value: "oman", label: "Oman" },
  { value: "bahrain", label: "Bahrain" },
  { value: "bulgaria", label: "Bulgaria" },
  { value: "cyprus", label: "Cyprus" },
  { value: "estonia", label: "Estonia" },
  { value: "latvia", label: "Latvia" },
  { value: "lithuania", label: "Lithuania" },
  { value: "malta", label: "Malta" },
  { value: "ukraine", label: "Ukraine" },
  { value: "worldwide", label: "Worldwide" },
];

export function SearchModal() {
  const isOpen = useJobSearchStore((s) => s.isModalOpen);
  const mode = useJobSearchStore((s) => s.modalMode);
  const editingId = useJobSearchStore((s) => s.editingSearchId);
  const closeModal = useJobSearchStore((s) => s.closeModal);

  const { data: existingSearch } = useSearch(mode === "edit" ? editingId : null);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("usa");
  const [schedule, setSchedule] = useState<Schedule>("manual");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [workplaceTypes, setWorkplaceTypes] = useState<string[]>([]);
  const [commitmentTypes, setCommitmentTypes] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<number | undefined>();
  const [salaryMax, setSalaryMax] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<number | undefined>();

  // Populate form when editing an existing search
  const [populated, setPopulated] = useState(false);
  if (existingSearch && !populated && mode === "edit") {
    setTitle(existingSearch.title);
    setLocation(existingSearch.location);
    setCountry(existingSearch.country);
    setSchedule(existingSearch.schedule);
    setWorkplaceTypes(existingSearch.filters.workplaceTypes ?? []);
    setCommitmentTypes(existingSearch.filters.commitmentTypes ?? []);
    setSeniority(existingSearch.filters.seniority ?? []);
    setSalaryMin(existingSearch.filters.salaryMin);
    setSalaryMax(existingSearch.filters.salaryMax);
    setDateRange(existingSearch.filters.dateRange);
    setShowAdvanced(
      !!(
        existingSearch.filters.workplaceTypes?.length ||
        existingSearch.filters.commitmentTypes?.length ||
        existingSearch.filters.seniority?.length ||
        existingSearch.filters.salaryMin ||
        existingSearch.filters.salaryMax ||
        existingSearch.filters.dateRange
      ),
    );
    setPopulated(true);
  }

  const createMutation = useCreateSearch();
  const updateMutation = useUpdateSearch();
  const deleteMutation = useDeleteSearch();
  const checkDuplicate = useCheckDuplicate();
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setLocation("");
    setCountry("usa");
    setSchedule("manual");
    setShowAdvanced(false);
    setWorkplaceTypes([]);
    setCommitmentTypes([]);
    setSeniority([]);
    setSalaryMin(undefined);
    setSalaryMax(undefined);
    setDateRange(undefined);
    setDuplicateError(null);
    setPopulated(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    closeModal();
  }, [resetForm, closeModal]);

  const buildFilters = (): SearchFilters => {
    const filters: SearchFilters = {};
    if (workplaceTypes.length) filters.workplaceTypes = workplaceTypes;
    if (commitmentTypes.length) filters.commitmentTypes = commitmentTypes;
    if (seniority.length) filters.seniority = seniority;
    if (salaryMin !== undefined) filters.salaryMin = salaryMin;
    if (salaryMax !== undefined) filters.salaryMax = salaryMax;
    if (dateRange !== undefined) filters.dateRange = dateRange;
    return filters;
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setDuplicateError(null);

    const filters = buildFilters();
    const input: SearchInput = { title, location, country, schedule, filters };

    // Check duplicates for new searches or when title/location changed
    if (mode === "create") {
      const isDup = await checkDuplicate.mutateAsync({
        title,
        location,
        country,
      });
      if (isDup) {
        setDuplicateError("A search with the same title and location already exists.");
        setSaving(false);
        return;
      }
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(input);
      } else if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, input });
      }
      handleClose();
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : "Failed to save search.");
    } finally {
      setSaving(false);
    }
  }, [
    title,
    location,
    country,
    schedule,
    mode,
    editingId,
    createMutation,
    updateMutation,
    checkDuplicate,
    handleClose,
  ]);

  const handleDelete = useCallback(async () => {
    const confirmed = await ask("Delete this search and all its job postings?", {
      title: "Delete Search",
      kind: "warning",
    });
    if (!confirmed) return;
    if (!editingId) return;

    try {
      await deleteMutation.mutateAsync(editingId);
      useJobSearchStore.getState().setActiveSearchId(null);
      handleClose();
    } catch {
      // error state handled by the mutation
    }
  }, [editingId, deleteMutation, handleClose]);

  return (
    <AppModal
      opened={isOpen}
      onClose={handleClose}
      title={mode === "create" ? "New Search" : "Edit Search"}
      footer={
        <Group justify="space-between" w="100%">
          {mode === "edit" ? (
            <Button color="red" variant="outline" onClick={handleDelete}>
              Delete Search
            </Button>
          ) : (
            <span />
          )}
          <Group>
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!title.trim() || !location.trim()}
            >
              Save
            </Button>
          </Group>
        </Group>
      }
    >
      <Stack gap="md">
        {/* ── Simple fields ─────────────────────────────────────── */}
        <TextInput
          label="Job Title"
          placeholder="e.g. VP Growth"
          required
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          data-autofocus
        />

        <TextInput
          label="Location"
          placeholder="e.g. United States"
          required
          value={location}
          onChange={(e) => setLocation(e.currentTarget.value)}
        />

        <Select
          label="Country"
          data={COUNTRY_OPTIONS}
          value={country}
          onChange={(v) => v && setCountry(v)}
          searchable
          required
        />

        <Select
          label="Schedule"
          data={SCHEDULE_OPTIONS}
          value={schedule}
          onChange={(v) => v && setSchedule(v as Schedule)}
        />

        {/* ── Advanced toggle ────────────────────────────────────── */}
        <Button
          variant="subtle"
          onClick={() => setShowAdvanced((s) => !s)}
          size="sm"
          leftSection={showAdvanced ? <MdExpandMore size={16} /> : <MdChevronRight size={16} />}
        >
          {showAdvanced ? "Hide Advanced Filters" : "Advanced Filters"}
        </Button>

        <Collapse expanded={showAdvanced}>
          <Stack gap="md">
            <MultiSelect
              label="Workplace Type"
              data={WORKPLACE_OPTIONS}
              value={workplaceTypes}
              onChange={setWorkplaceTypes}
              clearable
            />

            <MultiSelect
              label="Commitment"
              data={COMMITMENT_OPTIONS}
              value={commitmentTypes}
              onChange={setCommitmentTypes}
              clearable
            />

            <MultiSelect
              label="Seniority"
              data={SENIORITY_OPTIONS}
              value={seniority}
              onChange={setSeniority}
              clearable
            />

            <Group grow>
              <NumberInput
                label="Min Salary"
                placeholder="e.g. 80000"
                value={salaryMin ?? ""}
                onChange={(v) => setSalaryMin(typeof v === "number" ? v : undefined)}
                min={0}
                step={5000}
              />
              <NumberInput
                label="Max Salary"
                placeholder="e.g. 200000"
                value={salaryMax ?? ""}
                onChange={(v) => setSalaryMax(typeof v === "number" ? v : undefined)}
                min={0}
                step={5000}
              />
            </Group>

            <NumberInput
              label="Date Range (days back)"
              placeholder="e.g. 30"
              value={dateRange ?? ""}
              onChange={(v) => setDateRange(typeof v === "number" ? v : undefined)}
              min={1}
              max={365}
            />
          </Stack>
        </Collapse>

        {/* ── Error ──────────────────────────────────────────────── */}
        {duplicateError && (
          <div style={{ color: "var(--mantine-color-red-5)", fontSize: 14 }}>{duplicateError}</div>
        )}
      </Stack>
    </AppModal>
  );
}

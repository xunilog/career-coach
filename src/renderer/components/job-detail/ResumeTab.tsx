// src/renderer/components/job-detail/ResumeTab.tsx
// ---------------------------------------------------------------------------
// Editable adapted resume via @mantine/tiptap rich-text editor.
// Generate button triggers the generation graph; disabled until research exists.
// Ctrl+S triggers save.
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect, useRef } from "react";
import { Box, Button, Text, Loader, Center, Group, Alert } from "@mantine/core";
import { MdDescription, MdInfo } from "react-icons/md";
import { useEditor, EditorContent } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import {
  useResumeQuery,
  useGenerateMutation,
  useSaveResume,
} from "../../hooks/useGenerationQueries";
import { useResearchQuery } from "../../hooks/useResearchQueries";

interface ResumeTabProps {
  jobId: string;
}

export function ResumeTab({ jobId }: ResumeTabProps) {
  const { data: resume, isLoading: resumeLoading } = useResumeQuery(jobId);
  const { data: research } = useResearchQuery(jobId);
  const {
    isGenerating,
    chunks,
    phase,
    error: genError,
    startGeneration,
  } = useGenerateMutation("resume");

  const { mutateAsync: saveResume } = useSaveResume(jobId);

  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: "",
    onUpdate: () => {
      setIsDirty(true);
    },
  });

  // Store editor reference for save
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Load existing resume content into editor
  useEffect(() => {
    if (editor && resume?.content) {
      editor.commands.setContent(resume.content, { contentType: "markdown" });
      setIsDirty(false);
    }
  }, [editor, resume?.content]);

  // Append streaming chunks to editor
  useEffect(() => {
    if (editor && chunks.length > 0) {
      const fullContent = chunks.join("");
      editor.commands.setContent(fullContent, { contentType: "markdown" });
    }
  }, [editor, chunks]);

  const handleGenerate = useCallback(() => {
    void startGeneration(jobId, false);
  }, [jobId, startGeneration]);

  const handleSave = useCallback(async () => {
    if (editor && isDirty) {
      const content = (editor as unknown as { getMarkdown: () => string }).getMarkdown();
      await saveResume(content);
      setIsDirty(false);
    }
  }, [editor, isDirty, saveResume]);

  // Ctrl+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const hasResearch =
    research &&
    (research.overview ||
      research.culture ||
      research.news ||
      research.keyPeople ||
      research.market);

  // ── Loading state ──────────────────────────────────────────────────
  if (resumeLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  // ── Empty state (no resume and not generating) ──────────────────────
  if (!resume?.content && !isGenerating) {
    return (
      <Box p="md" style={{ height: "100%", overflow: "auto" }}>
        <Center py="xl">
          <Box ta="center">
            <MdDescription size={32} style={{ marginBottom: 8, opacity: 0.6 }} />
            <Text size="lg" fw={500} mb="xs">
              No Adapted Resume Yet
            </Text>
            <Text size="sm" c="dimmed" mb="lg">
              Generate a tailored resume for this job based on your profile and research.
            </Text>
            <Button
              onClick={handleGenerate}
              leftSection={<MdDescription size={16} />}
              disabled={!hasResearch}
              title={
                !hasResearch ? "Run company research first to enable resume generation" : undefined
              }
            >
              Generate Resume
            </Button>
            {!hasResearch && (
              <Group gap={4} mt="xs" justify="center">
                <MdInfo size={14} style={{ opacity: 0.6 }} />
                <Text size="xs" c="dimmed">
                  Research this company first to enable resume generation
                </Text>
              </Group>
            )}
          </Box>
        </Center>
      </Box>
    );
  }

  return (
    <Box p="md" style={{ height: "100%", overflow: "auto" }}>
      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <Group mb="md" wrap="wrap">
        <Button
          onClick={handleGenerate}
          loading={isGenerating}
          leftSection={<MdDescription size={16} />}
          disabled={!hasResearch}
          title={
            !hasResearch ? "Run company research first to enable resume generation" : undefined
          }
        >
          {resume?.content ? "Re-generate Resume" : "Generate Resume"}
        </Button>
        {isDirty && (
          <Button variant="outline" onClick={handleSave}>
            Save (Ctrl+S)
          </Button>
        )}
        {isGenerating && phase && (
          <Text size="sm" c="dimmed">
            {phase}
          </Text>
        )}
      </Group>

      {/* ── Error state ────────────────────────────────────────────── */}
      {genError && (
        <Alert color="red" mb="md" withCloseButton>
          {genError}
        </Alert>
      )}

      {/* ── Editor ─────────────────────────────────────────────────── */}
      <Box
        style={{
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
          overflow: "hidden",
        }}
      >
        <EditorContent editor={editor} />
      </Box>

      {/* ── Dirty indicator ────────────────────────────────────────── */}
      {isDirty && (
        <Text size="xs" c="dimmed" mt="xs">
          Unsaved changes — press Ctrl+S to save
        </Text>
      )}
    </Box>
  );
}

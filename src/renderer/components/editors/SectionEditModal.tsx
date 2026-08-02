// src/renderer/components/editors/SectionEditModal.tsx
// ---------------------------------------------------------------------------
// Generic modal for editing a profile section via a minimal TipTap editor.
// Toolbar: Bold, Italic, H2, H3, BulletList, OrderedList only.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { RichTextEditor } from "@mantine/tiptap";
import { Button, Group, Text, Paper } from "@mantine/core";
import { AppModal } from "../shared/AppModal";

interface SectionEditModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  explanation: string;
  initialContent: string;
  onSave: (markdown: string) => void;
}

export function SectionEditModal({
  opened,
  onClose,
  title,
  explanation,
  initialContent,
  onSave,
}: SectionEditModalProps) {
  const isSettingProgrammatically = useRef(false);
  const prevEditorRef = useRef<ReturnType<typeof useEditor>>(null);
  const [editorReady, setEditorReady] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { HTMLAttributes: { class: "tiptap-list" } },
        orderedList: { HTMLAttributes: { class: "tiptap-list" } },
      }),
      Markdown.configure({
        indentation: { style: "space", size: 2 },
      }),
    ],
    contentType: "markdown",
    content: initialContent,
    editable: true,
    onUpdate: () => {
      if (isSettingProgrammatically.current) return;
      // No-op — we read on save, not on every keystroke
    },
    onCreate: () => {
      setEditorReady(true);
    },
  });

  // Sync editor instance ref for HMR detection
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      prevEditorRef.current = editor;
    }
  }, [editor]);

  // Reset content when modal opens with new initialContent
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editorReady) return;

    const currentMd = editor.getMarkdown() ?? "";
    if (initialContent !== currentMd) {
      isSettingProgrammatically.current = true;
      editor.commands.setContent(initialContent, { contentType: "markdown" });
      isSettingProgrammatically.current = false;
    }
  }, [editor, initialContent, editorReady, opened]);

  const handleSave = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const md = editor.getMarkdown() ?? "";
    onSave(md);
    onClose();
  }, [editor, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={title}
      footer={
        <Group justify="flex-end">
          <Button variant="default" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleSave}>
            Save
          </Button>
        </Group>
      }
    >
      <Text size="sm" c="dimmed" mb="md">
        {explanation}
      </Text>

      {!editor || editor.isDestroyed ? (
        <Paper withBorder p="xl" radius="md" mb="md">
          <Text c="dimmed" ta="center">
            Loading editor...
          </Text>
        </Paper>
      ) : (
        <RichTextEditor
          editor={editor}
          style={{ minHeight: 200, display: "flex", flexDirection: "column" }}
        >
          <RichTextEditor.Toolbar sticky stickyOffset={0}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>

          <RichTextEditor.Content fz="sm" style={{ flex: 1, minHeight: 150 }} />
        </RichTextEditor>
      )}
    </AppModal>
  );
}

// src/renderer/components/editors/MinimalTipTapEditor.tsx
// ---------------------------------------------------------------------------
// Standalone minimal TipTap editor — Bold, Italic, H2, H3, BulletList,
// OrderedList toolbar only. Used inline in modals that need multiple editors.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { RichTextEditor } from "@mantine/tiptap";
import { Paper, Text } from "@mantine/core";

interface MinimalTipTapEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function MinimalTipTapEditor({ content, onChange, placeholder }: MinimalTipTapEditorProps) {
  const isSettingProgrammatically = useRef(false);
  const prevContentRef = useRef(content);
  const [editorReady, setEditorReady] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { HTMLAttributes: { class: "tiptap-list" } },
        orderedList: { HTMLAttributes: { class: "tiptap-list" } },
        // Disable features not in the minimal toolbar
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
      }),
      Markdown.configure({
        indentation: { style: "space", size: 2 },
      }),
    ],
    contentType: "markdown",
    content,
    editable: true,
    onCreate: () => {
      setEditorReady(true);
    },
  });

  // Report content changes back to parent
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editorReady) return;

    const handler = () => {
      if (isSettingProgrammatically.current) return;
      const md = editor.getMarkdown() ?? "";
      if (md !== prevContentRef.current) {
        prevContentRef.current = md;
        onChange(md);
      }
    };

    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, editorReady, onChange]);

  // Sync external content in
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editorReady) return;

    if (content !== prevContentRef.current) {
      const currentMd = editor.getMarkdown() ?? "";
      if (content !== currentMd) {
        isSettingProgrammatically.current = true;
        editor.commands.setContent(content, { contentType: "markdown" });
        isSettingProgrammatically.current = false;
        prevContentRef.current = editor.getMarkdown() ?? "";
      }
    }
  }, [editor, content, editorReady]);

  if (!editor || editor.isDestroyed) {
    return (
      <Paper withBorder p="md" radius="sm">
        <Text c="dimmed" ta="center" size="sm">
          Loading editor...
        </Text>
      </Paper>
    );
  }

  return (
    <RichTextEditor
      editor={editor}
      style={{ minHeight: 100, display: "flex", flexDirection: "column" }}
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

      <RichTextEditor.Content
        fz="sm"
        style={{ flex: 1, minHeight: 80 }}
        {...(placeholder ? { "data-placeholder": placeholder } : {})}
      />
    </RichTextEditor>
  );
}

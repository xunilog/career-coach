// src/components/editors/MarkdownEditor.tsx
// ---------------------------------------------------------------------------
// Shared Markdown rich-text editor built on Mantine TipTap + @tiptap/markdown.
// Renders a full WYSIWYG toolbar and serializes content to/from Markdown.
// ---------------------------------------------------------------------------

import { useEffect, useRef, memo } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { RichTextEditor } from "@mantine/tiptap";
import { Paper, Text, Box } from "@mantine/core";

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
  height?: number | string;
}

export const MarkdownEditor = memo(function MarkdownEditor({
  content,
  onChange,
  editable = true,
  height,
}: MarkdownEditorProps) {
  const isSettingProgrammatically = useRef(false);
  const lastContentRef = useRef(content);
  const prevEditorRef = useRef<typeof editor>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { HTMLAttributes: { class: "tiptap-list" } },
        orderedList: { HTMLAttributes: { class: "tiptap-list" } },
        blockquote: { HTMLAttributes: { class: "tiptap-blockquote" } },
        code: { HTMLAttributes: { class: "tiptap-inline-code" } },
        codeBlock: { HTMLAttributes: { class: "tiptap-code-block" } },
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "tiptap-link" },
        },
      }),
      Markdown.configure({
        indentation: { style: "space", size: 2 },
      }),
    ],
    contentType: "markdown",
    content,
    editable,
    onUpdate: ({ editor: ed }) => {
      if (isSettingProgrammatically.current) return;
      const md = ed.getMarkdown?.() ?? "";
      if (md) onChange(md);
    },
  });

  // ── ResizeObserver: set explicit px height on ProseMirror when height is set
  //    CSS percentage heights don't reliably resolve across nested flex
  //    containers. We measure the content area and set a px value directly.
  useEffect(() => {
    if (!height || !editor || editor.isDestroyed) return;

    const wrapper = contentWrapperRef.current;
    if (!wrapper) return;

    const sync = () => {
      if (editor.isDestroyed || !editor.view?.dom) return;
      const h = wrapper.clientHeight;
      if (h > 0) {
        editor.view.dom.style.height = `${h}px`;
      }
    };

    const rafId = requestAnimationFrame(() => {
      sync();
      const observer = new ResizeObserver(() => sync());
      observer.observe(wrapper);
      (wrapper as unknown as Record<string, unknown>).__ro = observer;
    });

    return () => {
      cancelAnimationFrame(rafId);
      const obs = (wrapper as unknown as Record<string, unknown>).__ro as
        | ResizeObserver
        | undefined;
      obs?.disconnect();
    };
  }, [height, editor]);

  // Sync external content changes into the editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const editorChanged = editor !== prevEditorRef.current;
    prevEditorRef.current = editor;

    if (editorChanged) {
      lastContentRef.current = editor.getMarkdown?.() ?? "";
      return;
    }

    if (content === lastContentRef.current) return;

    lastContentRef.current = content;

    const currentMd = editor.getMarkdown() ?? "";
    if (content !== currentMd) {
      isSettingProgrammatically.current = true;
      editor.commands.setContent(content);
      isSettingProgrammatically.current = false;
      lastContentRef.current = editor.getMarkdown?.() ?? "";
    }
  }, [editor, content]);

  // Toggle editable
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Guard
  if (!editor || editor.isDestroyed) {
    return (
      <Paper withBorder p="xl" radius={0}>
        <Text c="dimmed" ta="center">
          Loading editor...
        </Text>
      </Paper>
    );
  }

  return (
    <Box h={height}>
      <RichTextEditor
        editor={editor}
        style={{ borderRadius: 0, height: "100%", display: "flex", flexDirection: "column" }}
      >
        <RichTextEditor.Toolbar sticky stickyOffset={0}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
            <RichTextEditor.Code />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Blockquote />
            <RichTextEditor.Hr />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <div ref={contentWrapperRef} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <RichTextEditor.Content fz="sm" style={{ height: "100%", overflowY: "auto" }} />
        </div>
      </RichTextEditor>
    </Box>
  );
});

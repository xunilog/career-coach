// src/renderer/components/chat/ChatInput.tsx
// ---------------------------------------------------------------------------
// Shared chat input — auto-sizing Mantine Textarea with Enter-to-send
// and Shift+Enter for newlines. Replaces single-line TextInput across
// all chat panels.
// ---------------------------------------------------------------------------

import { Textarea } from "@mantine/core";
import type { KeyboardEvent } from "react";

export interface ChatInputProps {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
}

export function ChatInput({ value, placeholder, disabled, onChange, onSend }: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onSend(trimmed);
      }
    }
  };

  return (
    <Textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      minRows={3}
      maxRows={3}
      style={{ flex: 1 }}
      radius={0}
    />
  );
}

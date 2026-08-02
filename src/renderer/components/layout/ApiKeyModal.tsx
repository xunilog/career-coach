// src/renderer/components/layout/ApiKeyModal.tsx
// ---------------------------------------------------------------------------
// ApiKeyModal — modal for updating the Anthropic API key from the
// header settings dropdown.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Modal, TextInput, Button, Alert, Stack, Text } from "@mantine/core";
import { MdVpnKey, MdError } from "react-icons/md";
import { useMutation } from "@tanstack/react-query";
import { verifyAndStoreKey } from "../../../shared/api-key-manager";
import { clearModelCache } from "../../../shared/llm-provider";

interface ApiKeyModalProps {
  opened: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ opened, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (key: string) => verifyAndStoreKey("anthropic", key),
    onSuccess: () => {
      clearModelCache();
      setApiKey("");
      setErrorMessage(null);
      onClose();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    verifyMutation.mutate(trimmed);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Anthropic API Key"
      size="md"
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Enter a new API key to update your credentials. Your key is verified
          before saving.
        </Text>

        <TextInput
          placeholder="sk-ant-api..."
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
          type="password"
          leftSection={<MdVpnKey size={16} />}
          autoFocus
          disabled={verifyMutation.isPending}
        />

        {errorMessage && (
          <Alert variant="light" color="red" icon={<MdError />}>
            {errorMessage}
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          fullWidth
          loading={verifyMutation.isPending}
          disabled={!apiKey.trim() || verifyMutation.isPending}
        >
          Verify & Save
        </Button>
      </Stack>
    </Modal>
  );
}

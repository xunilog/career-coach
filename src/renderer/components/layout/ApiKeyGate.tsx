// src/renderer/components/layout/ApiKeyGate.tsx
// ---------------------------------------------------------------------------
// ApiKeyGate — full-screen page shown at app startup when no API key is
// available. Blocks access to the main shell until a verified key is stored.
// ---------------------------------------------------------------------------

import { useState, FormEvent } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Alert,
  Stack,
  Loader,
  Center,
} from "@mantine/core";
import { MdVpnKey, MdError } from "react-icons/md";
import { useQuery, useMutation } from "@tanstack/react-query";
import { hasKey, verifyAndStoreKey } from "../../../shared/api-key-manager";

interface ApiKeyGateProps {
  onKeyReady: () => void;
}

export function ApiKeyGate({ onKeyReady }: ApiKeyGateProps) {
  const [apiKey, setApiKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  // Check if a key already exists
  const { isLoading: isChecking } = useQuery({
    queryKey: ["api-key-status"],
    queryFn: () => hasKey("anthropic"),
    retry: false,
    select: (exists) => {
      // If key already exists, skip the gate
      if (exists) onKeyReady();
      return exists;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (key: string) => verifyAndStoreKey("anthropic", key),
    onSuccess: () => {
      onKeyReady();
    },
    onError: (error: Error) => {
      setIsNetworkError(error.message.includes("Unable to reach"));
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    setIsNetworkError(false);
    verifyMutation.mutate(trimmed);
  };

  const handleRetry = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    setIsNetworkError(false);
    verifyMutation.mutate(trimmed);
  };

  if (isChecking || verifyMutation.isPending) {
    return (
      <Center h="100vh" bg="dark.8">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">
            {verifyMutation.isPending ? "Verifying your API key..." : "Checking configuration..."}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Center h="100vh" bg="dark.8">
      <Container size={420} w="100%">
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="lg">
            <Center>
              <MdVpnKey size={48} opacity={0.6} />
            </Center>

            <Title order={2} ta="center">
              Enter Anthropic API Key
            </Title>

            <Text size="sm" c="dimmed" ta="center">
              Your API key is stored locally and verified before use. You can
              get one from the{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anthropic Console
              </a>
              .
            </Text>

            <form onSubmit={handleSubmit}>
              <Stack gap="sm">
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
                  <Alert
                    variant="light"
                    color="red"
                    icon={<MdError />}
                    title={isNetworkError ? "Connection Error" : "Invalid Key"}
                  >
                    <Stack gap="xs">
                      <Text size="sm">{errorMessage}</Text>
                      {isNetworkError && (
                        <Button
                          variant="light"
                          color="red"
                          size="xs"
                          onClick={handleRetry}
                          fullWidth={false}
                        >
                          Retry
                        </Button>
                      )}
                    </Stack>
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  loading={verifyMutation.isPending}
                  disabled={!apiKey.trim() || verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify & Continue"}
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
}

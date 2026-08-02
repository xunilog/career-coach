// src/renderer/hooks/useConversationQueries.ts
// ---------------------------------------------------------------------------
// TanStack Query hooks for conversation history — list, create, delete.
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "../../services/conversation-service";
import {
  listConversationsAuto,
  getLatestConversationAuto,
  createConversationAuto,
  deleteConversationAuto,
} from "../../services/conversation-service";

const CONVERSATIONS_KEY = ["conversations"] as const;

export function useConversationsQuery(type?: string) {
  return useQuery<Conversation[]>({
    queryKey: [...CONVERSATIONS_KEY, type ?? "all"],
    queryFn: () => listConversationsAuto(type),
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useLatestConversation(type?: string) {
  return useQuery<Conversation | null>({
    queryKey: [...CONVERSATIONS_KEY, "latest", type ?? "all"],
    queryFn: () => getLatestConversationAuto(type),
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateConversation(type?: string) {
  const queryClient = useQueryClient();

  return useMutation<Conversation, Error, void>({
    mutationFn: () => createConversationAuto(type),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (threadId) => {
      return { success: await deleteConversationAuto(threadId) };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

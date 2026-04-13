import { create } from 'zustand';
import type { Message } from '@/types/message';

interface MessageState {
  // Messages grouped by conversationId
  messagesByConversation: Record<string, Message[]>;
  loadingMessages: boolean;
  hasMore: Record<string, boolean>;
  page: Record<string, number>;

  setMessages: (conversationId: string, messages: Message[]) => void;
  appendOlderMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  setLoadingMessages: (loading: boolean) => void;
  setHasMore: (conversationId: string, hasMore: boolean) => void;
  setPage: (conversationId: string, page: number) => void;
  clearMessages: (conversationId: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messagesByConversation: {},
  loadingMessages: false,
  hasMore: {},
  page: {},

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),

  appendOlderMessages: (conversationId, messages) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      // Deduplicate
      const existingIds = new Set(existing.map((m) => m.id));
      const newMessages = messages.filter((m) => !existingIds.has(m.id));
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...existing, ...newMessages],
        },
      };
    }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      // Avoid duplicates
      if (existing.some((m) => m.id === message.id)) return state;
      // Newest message goes at the START (list is stored newest-first)
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [message, ...existing],
        },
      };
    }),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m,
          ),
        },
      };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.filter((m) => m.id !== messageId),
        },
      };
    }),

  setLoadingMessages: (loading) => set({ loadingMessages: loading }),

  setHasMore: (conversationId, hasMore) =>
    set((state) => ({
      hasMore: { ...state.hasMore, [conversationId]: hasMore },
    })),

  setPage: (conversationId, page) =>
    set((state) => ({
      page: { ...state.page, [conversationId]: page },
    })),

  clearMessages: (conversationId) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [],
      },
      page: { ...state.page, [conversationId]: 0 },
      hasMore: { ...state.hasMore, [conversationId]: true },
    })),
}));

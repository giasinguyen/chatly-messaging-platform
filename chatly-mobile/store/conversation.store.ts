import { create } from 'zustand';
import type { ConversationResponse } from '@/types/conversation';

interface ConversationState {
  conversations: ConversationResponse[];
  loading: boolean;
  activeConversationId: string | null;

  setConversations: (conversations: ConversationResponse[]) => void;
  addConversation: (conversation: ConversationResponse) => void;
  updateConversation: (id: string, updates: Partial<ConversationResponse>) => void;
  removeConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  loading: false,
  activeConversationId: null,

  setConversations: (conversations) =>
    set({
      conversations: conversations.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp ?? a.updatedAt;
        const timeB = b.lastMessage?.timestamp ?? b.updatedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      }),
    }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations
        .map((c) => (c.id === id ? { ...c, ...updates } : c))
        .sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ?? a.updatedAt;
          const timeB = b.lastMessage?.timestamp ?? b.updatedAt;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        }),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setLoading: (loading) => set({ loading }),
}));

import { create } from 'zustand';
import type { ConversationResponse, LastMessage } from '@/types/conversation';
import type { NotificationResponse } from '@/types/notification';
import { conversationService } from '@/services/conversation.service';

interface ConversationState {
  conversations: ConversationResponse[];
  loading: boolean;
  activeConversationId: string | null;

  setConversations: (conversations: ConversationResponse[]) => void;
  fetchConversations: () => Promise<void>;
  addConversation: (conversation: ConversationResponse) => void;
  updateConversation: (id: string, updates: Partial<ConversationResponse>) => void;
  handleIncomingMessage: (notification: NotificationResponse) => void;
  removeConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
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

  fetchConversations: async () => {
    const { setLoading, setConversations } = get();
    try {
      setLoading(true);
      const res = await conversationService.getMyConversations();
      setConversations(res.result);
    } catch (error) {
      console.error('STORE: Failed to fetch conversations', error);
    } finally {
      setLoading(false);
    }
  },

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

  handleIncomingMessage: (notification) => {
    const state = get();
    const convId = notification.referenceId;
    console.log('--- STORE: handleIncomingMessage ---');
    console.log('Target Conv ID:', convId);
    console.log('Current Active Chat ID:', state.activeConversationId);
    
    if (!convId) return;

    const existingConv = state.conversations.find((c) => c.id === convId);
    
    if (!existingConv) {
      console.log('Conversation not found in local state, triggering FULL REFRESH...');
      state.fetchConversations();
      return;
    }

    console.log('Existing conversation found, updating locally');
    const lastMsg: LastMessage = {
      senderId: notification.senderId || '',
      content: notification.content || '',
      type: 'TEXT',
      timestamp: new Date().toISOString(),
    };

    const isNotActive = state.activeConversationId !== convId;
    const updatedConv: ConversationResponse = {
      ...existingConv,
      lastMessage: lastMsg,
      unreadCount: isNotActive ? (existingConv.unreadCount || 0) + 1 : 0,
      updatedAt: new Date().toISOString(),
    };

    set({
      conversations: [
        updatedConv,
        ...state.conversations.filter((c) => c.id !== convId),
      ],
    });
  },

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    })),

  setActiveConversation: (id) =>
    set((state) => {
      console.log('--- STORE: setActiveConversation ---', id);
      if (id) {
        return {
          activeConversationId: id,
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, unreadCount: 0 } : c
          ),
        };
      }
      return { activeConversationId: null };
    }),

  setLoading: (loading) => set({ loading }),
}));

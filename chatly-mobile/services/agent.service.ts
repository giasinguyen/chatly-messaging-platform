import { fetch } from 'expo/fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '@/lib/axiosClient';
import type {
  AgentSession,
  AgentSessionCreateOptions,
  AgentSessionList,
  AgentMessageHistory,
  AgentChatRequest,
  AgentChatResponse,
} from '@/types/agent';

const BASE = '/api/ai/sessions';
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8080').replace(/\/+$/, '');

export const agentService = {
  // ─── Sessions ────────────────────────────────────────────
  createSession: async (
    titleOrOptions: string | AgentSessionCreateOptions = 'New Chat',
  ): Promise<AgentSession> => {
    const payload =
      typeof titleOrOptions === 'string'
        ? { title: titleOrOptions }
        : {
            title: titleOrOptions.title ?? 'New Chat',
            context_conversation_id: titleOrOptions.context_conversation_id,
          };
    const res = await axiosClient.post(BASE, payload);
    return res.data;
  },

  listSessions: async (): Promise<AgentSessionList> => {
    const res = await axiosClient.get(BASE);
    return res.data;
  },

  getSession: async (sessionId: string): Promise<AgentSession> => {
    const res = await axiosClient.get(`${BASE}/${sessionId}`);
    return res.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await axiosClient.delete(`${BASE}/${sessionId}`);
  },

  renameSession: async (sessionId: string, title: string): Promise<AgentSession> => {
    const res = await axiosClient.patch(`${BASE}/${sessionId}`, { title });
    return res.data;
  },

  // ─── Messages ────────────────────────────────────────────
  getHistory: async (sessionId: string): Promise<AgentMessageHistory> => {
    const res = await axiosClient.get(`${BASE}/${sessionId}/messages`);
    return res.data;
  },

  // ─── Chat (blocking) ────────────────────────────────────
  chat: async (sessionId: string, payload: AgentChatRequest): Promise<AgentChatResponse> => {
    const res = await axiosClient.post(`${BASE}/${sessionId}/chat`, payload);
    return res.data;
  },

  // ─── Chat (SSE stream) — returns raw Response for streaming ─
  chatStream: async (
    sessionId: string,
    payload: AgentChatRequest,
    signal?: AbortSignal,
  ): Promise<Response> => {
    const token = await AsyncStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}${BASE}/${sessionId}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal,
      reactNative: { textStreaming: true },
    } as any);
  },

};

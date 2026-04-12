import { useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { agentService } from '@/services/agent.service';
import { useChatbotStore } from '@/store/chatbot.store';
import type { AgentChatRequest, AgentStreamChunk } from '@/types/agent';

export function useAgentStream() {
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (sessionId: string, payload: AgentChatRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const store = useChatbotStore.getState();
    store.setStreamingStatus('connecting');
    store.setStreamingContent('');
    store.setStatusHint('thinking');

    // Heuristic status hint rotation
    let hintTimer: ReturnType<typeof setInterval> | undefined;
    const hints = payload.use_web_search
      ? (['thinking', 'searching_web', 'analyzing_documents'] as const)
      : (['thinking', 'generating'] as const);
    let hintIdx = 0;
    hintTimer = setInterval(() => {
      hintIdx = (hintIdx + 1) % hints.length;
      useChatbotStore.getState().setStatusHint(hints[hintIdx]);
    }, 3000);

    try {
      const response = await agentService.chatStream(sessionId, payload, controller.signal);

      if (!response.ok) throw new Error(`Stream request failed: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      useChatbotStore.getState().setStreamingStatus('streaming');
      clearInterval(hintTimer);
      hintTimer = undefined;
      useChatbotStore.getState().setStatusHint('generating');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const chunk: AgentStreamChunk = JSON.parse(jsonStr);
            if ('done' in chunk && chunk.done) {
              const finalContent = useChatbotStore.getState().streamingContent;
              useChatbotStore.getState().appendMessage(sessionId, {
                id: `assistant-${Date.now()}`,
                session_id: sessionId,
                role: 'assistant',
                content: finalContent,
                created_at: new Date().toISOString(),
              });
              useChatbotStore.getState().setStreamingStatus('done');
            } else if ('token' in chunk) {
              useChatbotStore.getState().appendStreamToken(chunk.token);
            }
          } catch {
            /* skip malformed JSON */
          }
        }
      }

      // Finalize if stream ended without a done chunk
      const currentStatus = useChatbotStore.getState().streamingStatus;
      if (currentStatus !== 'done') {
        const finalContent = useChatbotStore.getState().streamingContent;
        if (finalContent) {
          useChatbotStore.getState().appendMessage(sessionId, {
            id: `assistant-${Date.now()}`,
            session_id: sessionId,
            role: 'assistant',
            content: finalContent,
            created_at: new Date().toISOString(),
          });
        }
        useChatbotStore.getState().setStreamingStatus('done');
      }
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted');
      if (isAbort) {
        useChatbotStore.getState().setStreamingStatus('idle');
      } else {
        console.error('Stream error:', err);
        Alert.alert('Error', 'Could not receive response from AI');
        useChatbotStore.getState().setStreamingStatus('error');
      }
    } finally {
      if (hintTimer) clearInterval(hintTimer);
      abortRef.current = null;
    }
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    useChatbotStore.getState().resetStreaming();
  }, []);

  return { startStream, cancelStream };
}

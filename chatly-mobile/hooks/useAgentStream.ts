import { useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { agentService } from '@/services/agent.service';
import { useChatbotStore } from '@/store/chatbot.store';
import type {
  AgentChatRequest,
  AgentStreamEvent,
  DoneEventData,
  TokenEventData,
  ToolStartEventData,
  ToolEndEventData,
} from '@/types/agent';

export function useAgentStream(sessionId?: string) {
  const abortRef = useRef<AbortController | null>(null);
  const tokenBufferRef = useRef('');
  const tokenFlushTimerRef = useRef<number | null>(null);

  /** Flush accumulated token buffer into the store. */
  const flushTokenBuffer = useCallback(() => {
    if (tokenBufferRef.current) {
      useChatbotStore.getState().appendStreamToken(tokenBufferRef.current);
      tokenBufferRef.current = '';
    }
    tokenFlushTimerRef.current = null;
  }, []);

  /** Dispatch a single parsed SSE line into the store. */
  const dispatchEvent = useCallback((event: AgentStreamEvent, sid: string) => {
    console.log('[SSE] event type:', event.type, 'data:', JSON.stringify(event.data).slice(0, 200));
    if (event.type === 'token') {
      const tokenData = event.data as unknown as TokenEventData;
      // Buffer tokens and throttle at ~30fps to reduce re-renders
      tokenBufferRef.current += tokenData.content;
      if (!tokenFlushTimerRef.current) {
        tokenFlushTimerRef.current = setTimeout(flushTokenBuffer, 32);
      }
    } else if (event.type === 'tool_start') {
      const toolData = event.data as unknown as ToolStartEventData;
      useChatbotStore.getState().addToolCall({
        tool: toolData.tool,
        input: toolData.input,
        status: 'running',
      });
    } else if (event.type === 'tool_end') {
      const toolData = event.data as unknown as ToolEndEventData;
      useChatbotStore.getState().updateToolCall(toolData.tool, {
        output: toolData.output,
        status: 'done',
      });
    } else if (event.type === 'done') {
      // Flush any pending tokens before finalizing
      if (tokenFlushTimerRef.current) {
        clearTimeout(tokenFlushTimerRef.current);
        tokenFlushTimerRef.current = null;
      }
      flushTokenBuffer();

      const doneData = event.data as unknown as DoneEventData;
      const finalContent = useChatbotStore.getState().streamingContent;
      useChatbotStore.getState().appendMessage(sid, {
        id: doneData.message_id,
        session_id: sid,
        role: 'assistant',
        content: finalContent,
        attachments: doneData.attachments ?? [],
        created_at: new Date().toISOString(),
      });
      useChatbotStore.getState().setStreamingStatus('done');
      useChatbotStore.getState().setToolCalls([]);
    } else if (event.type === 'error') {
      const errData = event.data as { message: string };
      Alert.alert('Error', errData.message ?? 'AI response error');
      useChatbotStore.getState().setStreamingStatus('error');
    }
  }, [flushTokenBuffer]);

  /** Parse a single SSE line and dispatch if valid. */
  const parseSseLine = useCallback((line: string, sid: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) return;
    console.log('[SSE] raw line:', jsonStr.slice(0, 300));
    try {
      const event: AgentStreamEvent = JSON.parse(jsonStr);
      dispatchEvent(event, sid);
    } catch (e) {
      console.warn('[SSE] JSON parse failed:', (e as Error).message, 'input:', jsonStr.slice(0, 200));
    }
  }, [dispatchEvent]);

  /** Shared SSE reader for streaming responses. */
  const processEventStream = useCallback(async (response: Response, sid: string) => {
    if (!response.body) throw new Error('No response body');

    const store = useChatbotStore.getState();
    store.setStreamingStatus('streaming');
    store.setStatusHint('generating');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[SSE] stream done. remaining buffer:', JSON.stringify(buffer));
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      console.log('[SSE] chunk received, length:', chunk.length, 'preview:', JSON.stringify(chunk.slice(0, 200)));
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        parseSseLine(line, sid);
      }
    }

    // Flush remaining buffer — expo/fetch may close the stream before
    // delivering the trailing \n\n of the last SSE event.
    buffer += decoder.decode();
    if (buffer.trim()) {
      console.log('[SSE] flushing remaining buffer:', JSON.stringify(buffer.slice(0, 300)));
      parseSseLine(buffer, sid);
    }

    // Finalize if stream ended without a done event
    const currentStatus = useChatbotStore.getState().streamingStatus;
    console.log('[SSE] post-stream status:', currentStatus);
    if (currentStatus === 'streaming') {
      const finalContent = useChatbotStore.getState().streamingContent;
      if (finalContent) {
        useChatbotStore.getState().appendMessage(sid, {
          id: `assistant-${Date.now()}`,
          session_id: sid,
          role: 'assistant',
          content: finalContent,
          created_at: new Date().toISOString(),
        });
      }
      useChatbotStore.getState().setStreamingStatus('idle');
    }
  }, [parseSseLine]);

  const startStream = useCallback(async (sid: string, payload: AgentChatRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const store = useChatbotStore.getState();
    store.setStreamingStatus('connecting');
    store.setStreamingContent('');
    store.setStatusHint('thinking');
    store.setToolCalls([]);

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
      const response = await agentService.chatStream(sid, payload, controller.signal);
      if (!response.ok) throw new Error(`Stream request failed: ${response.status}`);

      clearInterval(hintTimer);
      hintTimer = undefined;

      await processEventStream(response, sid);
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted');
      if (isAbort) {
        useChatbotStore.getState().setStreamingStatus('idle');
      } else {
        Alert.alert('Error', 'Could not receive response from AI');
        useChatbotStore.getState().setStreamingStatus('error');
      }
    } finally {
      if (hintTimer) clearInterval(hintTimer);
      abortRef.current = null;
    }
  }, [processEventStream]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // Flush remaining tokens before reset
    if (tokenFlushTimerRef.current) {
      clearTimeout(tokenFlushTimerRef.current);
      tokenFlushTimerRef.current = null;
    }
    flushTokenBuffer();
    useChatbotStore.getState().resetStreaming();
  }, [flushTokenBuffer]);

  return { startStream, cancelStream };
}

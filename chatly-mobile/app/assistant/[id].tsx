import { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/theme';
import { agentService } from '@/services/agent.service';
import { useChatbotStore } from '@/store/chatbot.store';
import { useAgentStream } from '@/hooks/useAgentStream';
import { AssistantHeader } from '@/components/assistant/AssistantHeader';
import { AssistantMessageBubble } from '@/components/assistant/AssistantMessageBubble';
import { AssistantComposer } from '@/components/assistant/AssistantComposer';
import { AssistantThinkingIndicator } from '@/components/assistant/AssistantThinkingIndicator';
import { AssistantStreamingBubble } from '@/components/assistant/AssistantStreamingBubble';
import type { AgentMessage } from '@/types/agent';

export default function AssistantChatScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<AgentMessage>>(null);

  const {
    messagesBySession,
    setMessages,
    appendMessage,
    streamingStatus,
    streamingContent,
    statusHint,
    setStreamingStatus,
    setActiveSessionId,
    resetStreaming,
    sessions,
    useWebSearch,
    selectedMcpIds,
    setLastUserPrompt,
    lastUserPrompt,
  } = useChatbotStore();

  const { startStream, cancelStream } = useAgentStream();
  const messages = messagesBySession[sessionId ?? ''] ?? [];
  const isStreaming = streamingStatus === 'connecting' || streamingStatus === 'streaming';
  const isThinking = streamingStatus === 'connecting' || streamingStatus === 'thinking';

  const [loading, setLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [mcpConfigVisible, setMcpConfigVisible] = useState(false);

  const session = sessions.find((s) => s.id === sessionId);
  const title = session?.title ?? 'New Conversation';

  // Set active session / load history
  useEffect(() => {
    if (!sessionId) return;
    setActiveSessionId(sessionId);

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await agentService.getHistory(sessionId);
        setMessages(sessionId, res.messages);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      setActiveSessionId(null);
      resetStreaming();
    };
  }, [sessionId, setActiveSessionId, setMessages, resetStreaming]);

  // Auto-scroll when new messages or streaming content
  useEffect(() => {
    if (!showScrollDown) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, streamingContent, showScrollDown]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId) return;

      // Append user message optimistically
      const userMsg: AgentMessage = {
        id: `user-${Date.now()}`,
        session_id: sessionId,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };
      appendMessage(sessionId, userMsg);
      setLastUserPrompt(text);

      // Start SSE stream
      await startStream(sessionId, {
        message: text,
        use_web_search: useWebSearch,
        mcp_server_ids: selectedMcpIds,
      });
    },
    [sessionId, appendMessage, startStream, useWebSearch, selectedMcpIds, setLastUserPrompt],
  );

  const handleRetry = useCallback(() => {
    if (!lastUserPrompt || !sessionId) return;

    // Remove last assistant message if it's an error
    const msgs = useChatbotStore.getState().messagesBySession[sessionId] ?? [];
    const last = msgs[msgs.length - 1];
    if (last?.role === 'assistant') {
      setMessages(
        sessionId,
        msgs.filter((m) => m.id !== last.id),
      );
    }

    resetStreaming();

    startStream(sessionId, {
      message: lastUserPrompt,
      use_web_search: useWebSearch,
      mcp_server_ids: selectedMcpIds,
    });
  }, [lastUserPrompt, sessionId, setMessages, resetStreaming, startStream, useWebSearch, selectedMcpIds]);

  const handleCopy = useCallback(async (content: string) => {
    await Clipboard.setStringAsync(content);
  }, []);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      setShowScrollDown(distanceFromBottom > 200);
    },
    [],
  );

  const scrollToEnd = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollDown(false);
  }, []);

  const renderMessage = useCallback(
    ({ item, index }: { item: AgentMessage; index: number }) => {
      const isLastAssistant =
        item.role === 'assistant' &&
        index === messages.length - 1 &&
        streamingStatus === 'error';

      return (
        <AssistantMessageBubble
          message={item}
          isLast={index === messages.length - 1}
          isError={isLastAssistant}
          onRetry={isLastAssistant ? handleRetry : undefined}
          onCopy={handleCopy}
        />
      );
    },
    [messages.length, streamingStatus, handleRetry, handleCopy],
  );

  const keyExtractor = useCallback((item: AgentMessage) => item.id, []);

  // Footer: thinking indicator or streaming bubble
  const ListFooter = useCallback(() => {
    if (isThinking) {
      return <AssistantThinkingIndicator hint={statusHint} />;
    }
    if (streamingStatus === 'streaming' && streamingContent) {
      return <AssistantStreamingBubble content={streamingContent} />;
    }
    return null;
  }, [isThinking, statusHint, streamingStatus, streamingContent]);

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.white }}>
      <AssistantHeader title={title} onPressSetting={() => setMcpConfigVisible(true)} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={Colors.cta} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              ListFooterComponent={ListFooter}
              onScroll={handleScroll}
              scrollEventThrottle={100}
              contentContainerStyle={{
                paddingVertical: 12,
                flexGrow: 1,
              }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Scroll-to-bottom FAB */}
          {showScrollDown && (
            <TouchableOpacity
              onPress={scrollToEnd}
              className="absolute right-4 items-center justify-center rounded-full"
              style={{
                bottom: 8,
                width: 36,
                height: 36,
                backgroundColor: Colors.white,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Ionicons name="chevron-down" size={20} color={Colors.cta} />
            </TouchableOpacity>
          )}
        </View>

        <AssistantComposer
          sessionId={sessionId ?? ''}
          onSend={handleSend}
          isStreaming={isStreaming}
          onCancel={cancelStream}
          disabled={isStreaming}
          mcpConfigVisible={mcpConfigVisible}
          onMcpConfigChange={setMcpConfigVisible}
        />

        {/* Bottom safe area */}
        <View style={{ height: insets.bottom, backgroundColor: Colors.white }} />
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

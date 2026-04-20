import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LegendList, type LegendListRef } from '@legendapp/list';
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
import { AssistantListFooter } from '@/components/assistant/AssistantListFooter';
import { InterruptCard } from '@/components/assistant/InterruptCard';
import type { AgentMessage } from '@/types/agent';
// LỖI KHÔNG RENDER ĐƯỢC InterruptCard. TẠM THỜI BỎ CUỘC 
export default function AssistantChatScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<LegendListRef>(null);

  const {
    messagesBySession,
    setMessages,
    appendMessage,
    streamingStatus,
    streamingContent,
    setActiveSessionId,
    resetStreaming,
    sessions,
    useWebSearch,
    selectedMcpIds,
    setLastUserPrompt,
    lastUserPrompt,
    toolCalls,
  } = useChatbotStore();

  // Individual selector — interrupt data for footer/overlay rendering + composer disable
  const interrupt = useChatbotStore((s) => s.interrupt);
  const isInterrupted = interrupt !== null;

  const { startStream, resumeStream, cancelStream } = useAgentStream(sessionId);
  const messages = useMemo(() => messagesBySession[sessionId ?? ''] ?? [], [messagesBySession, sessionId]);
  const isStreaming = streamingStatus === 'connecting' || streamingStatus === 'streaming';

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
  }, [messages.length, streamingContent, isInterrupted, showScrollDown]);

  const handleSend = useCallback(
    async (text: string, fileIds: string[] = []) => {
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
        file_ids: fileIds,
      });
    },
    [sessionId, appendMessage, startStream, useWebSearch, selectedMcpIds, setLastUserPrompt]
  );

  const handleRetry = useCallback(() => {
    if (!lastUserPrompt || !sessionId) return;

    // Remove last assistant message if it's an error
    const msgs = useChatbotStore.getState().messagesBySession[sessionId] ?? [];
    const last = msgs[msgs.length - 1];
    if (last?.role === 'assistant') {
      setMessages(
        sessionId,
        msgs.filter((m) => m.id !== last.id)
      );
    }

    resetStreaming();

    startStream(sessionId, {
      message: lastUserPrompt,
      use_web_search: useWebSearch,
      mcp_server_ids: selectedMcpIds,
      file_ids: [],
    });
  }, [
    lastUserPrompt,
    sessionId,
    setMessages,
    resetStreaming,
    startStream,
    useWebSearch,
    selectedMcpIds,
  ]);

  const handleCopy = useCallback(async (content: string) => {
    await Clipboard.setStringAsync(content);
  }, []);

  const handleApproveInterrupt = useCallback(() => {
    if (!sessionId) return;
    resumeStream(sessionId, true);
  }, [sessionId, resumeStream]);

  const handleRejectInterrupt = useCallback(() => {
    if (!sessionId) return;
    resumeStream(sessionId, false);
  }, [sessionId, resumeStream]);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      setShowScrollDown(distanceFromBottom > 200);
    },
    []
  );

  const scrollToEnd = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollDown(false);
  }, []);

  const getItemType = useCallback((item: AgentMessage) => item.role, []);

  const renderItem = useCallback(
    ({ item, index }: { item: AgentMessage; index: number }) => {
      const isLastAssistant =
        item.role === 'assistant' && index === messages.length - 1 && streamingStatus === 'error';
      return (
        <AssistantMessageBubble
          message={item}
          sessionId={sessionId ?? ''}
          isLast={index === messages.length - 1}
          isError={isLastAssistant}
          onRetry={isLastAssistant ? handleRetry : undefined}
          onCopy={handleCopy}
        />
      );
    },
    [messages.length, streamingStatus, sessionId, handleRetry, handleCopy]
  );

  const keyExtractor = useCallback((item: AgentMessage) => item.id, []);

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.white }}>
      <AssistantHeader title={title} onPressSetting={() => setMcpConfigVisible(true)} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}>
          <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={Colors.cta} />
              </View>
            ) : (
              <LegendList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListFooterComponent={AssistantListFooter}
                extraData={`${streamingStatus}-${streamingContent.length}-${toolCalls.length}-${isInterrupted}`}
                onScroll={handleScroll}
                scrollEventThrottle={100}
                contentContainerStyle={{
                  paddingVertical: 12,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                maintainScrollAtEnd
                alignItemsAtEnd
                estimatedItemSize={100}
                getItemType={getItemType}
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
                }}>
                <Ionicons name="chevron-down" size={20} color={Colors.cta} />
              </TouchableOpacity>
            )}
          </View>

          {/* Absolute overlay interrupt card — backup rendering outside list */}
          {interrupt !== null && (
            <View
              style={{
                position: 'absolute',
                bottom: 80,
                left: 0,
                right: 0,
                zIndex: 100,
                pointerEvents: 'box-none',
              }}>
              <InterruptCard
                interrupt={interrupt}
                onApprove={handleApproveInterrupt}
                onReject={handleRejectInterrupt}
              />
            </View>
          )}

          <AssistantComposer
            sessionId={sessionId ?? ''}
            onSend={handleSend}
            isStreaming={isStreaming}
            onCancel={cancelStream}
            disabled={isStreaming || isInterrupted}
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

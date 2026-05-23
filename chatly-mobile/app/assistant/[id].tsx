import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LegendList, type LegendListRef } from '@legendapp/list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getAssistantContextMode } from '@/constants/assistant';
import { Colors } from '@/constants/theme';
import { agentService } from '@/services/agent.service';
import { useChatbotStore } from '@/store/chatbot.store';
import { useAuthStore } from '@/store/auth.store';
import { useAgentStream } from '@/hooks/useAgentStream';
import { AssistantHeader } from '@/components/assistant/AssistantHeader';
import { AssistantMessageBubble } from '@/components/assistant/AssistantMessageBubble';
import { AssistantComposer } from '@/components/assistant/AssistantComposer';
import { AssistantListFooter } from '@/components/assistant/AssistantListFooter';
import type { AgentMessage } from '@/types/agent';
import { AssistantMessageActions } from '@/components/assistant/AssistantMessageActions';
import { ForwardToChatModal } from '@/components/assistant/ForwardToChatModal';
import { AssistantQuickChips } from '@/components/assistant/AssistantQuickChips';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { useConversationStore } from '@/store/conversation.store';

export default function AssistantChatScreen() {
  const { id: sessionId, prefill, prefill_token } = useLocalSearchParams<{ id: string; prefill?: string; prefill_token?: string }>();
  const router = useRouter();
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
    addSession,
    useWebSearch,
    selectedMcpIds,
    setLastUserPrompt,
    lastUserPrompt,
    toolCalls,
    setDraft,
  } = useChatbotStore();

  const conversations = useConversationStore((s) => s.conversations);
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  const { startStream, cancelStream } = useAgentStream(sessionId);
  const messages = useMemo(() => messagesBySession[sessionId ?? ''] ?? [], [messagesBySession, sessionId]);
  const isStreaming = streamingStatus === 'connecting' || streamingStatus === 'streaming';

  const [loading, setLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [mcpConfigVisible, setMcpConfigVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);
  const [messageActionsVisible, setMessageActionsVisible] = useState(false);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);

  const session = sessions.find((s) => s.id === sessionId);
  const title = session?.title ?? 'New Conversation';
  const contextMode = getAssistantContextMode(session?.context_conversation_id);
  const contextConversationName =
    contextMode === 'group' && session?.context_conversation_id
      ? conversations.find((conversation) => conversation.id === session.context_conversation_id)?.name ?? 'this group'
      : contextMode === 'post'
        ? session?.title ?? 'Post context'
        : undefined;

  useEffect(() => {
    if (!sessionId || session) {
      return;
    }

    let isActive = true;

    const loadSession = async () => {
      try {
        const nextSession = await agentService.getSession(sessionId);
        if (isActive) {
          addSession(nextSession);
        }
      } catch {
        // Ignore session metadata failure; history load still drives the screen.
      }
    };

    void loadSession();

    return () => {
      isActive = false;
    };
  }, [addSession, session, sessionId]);

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

  // Apply prefill from navigation params (e.g. Ask AI from chat)
  const appliedPrefillTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionId || !prefill || !prefill_token) return;
    if (appliedPrefillTokenRef.current === prefill_token) return;
    appliedPrefillTokenRef.current = prefill_token;
    try {
      setDraft(sessionId, decodeURIComponent(prefill));
    } catch {
      setDraft(sessionId, prefill);
    }
  }, [sessionId, prefill, prefill_token, setDraft]);

  // Auto-scroll when new messages or streaming content
  useEffect(() => {
    if (!showScrollDown) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, streamingContent, showScrollDown]);

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

  const handleForwardToChat = useCallback(
    async (conversationId: string) => {
      if (!selectedMessage) return;
      const encoded = encodeURIComponent(selectedMessage.content);
      const token = Date.now().toString();
      setForwardModalVisible(false);
      setSelectedMessage(null);
      setMessageActionsVisible(false);
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: conversationId,
          prefill: encoded,
          prefill_token: token,
          returnTo: 'assistant',
        },
      });
    },
    [selectedMessage, router],
  );

  const handleChipSelect = useCallback(
    (query: string) => {
      if (!sessionId) return;
      setDraft(sessionId, query);
    },
    [sessionId, setDraft],
  );

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
          onLongPress={() => {
            setSelectedMessage(item);
            setMessageActionsVisible(true);
          }}
        />
      );
    },
    [messages.length, streamingStatus, sessionId, handleRetry, handleCopy]
  );

  const keyExtractor = useCallback((item: AgentMessage) => item.id, []);

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.white }}>
      <AssistantHeader
        title={title}
        onPressSetting={() => setMcpConfigVisible(true)}
        contextConversationName={contextConversationName}
        contextMode={contextMode}
      />

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
            ) : messages.length === 0 ? (
              <View className="flex-1 items-center justify-center px-8">
                <View
                  className="h-20 w-20 rounded-2xl items-center justify-center mb-5"
                  style={{ backgroundColor: Colors.ctaLight }}
                >
                  <CustomAiIcon size={34} color={Colors.cta} />
                </View>
                <Text className="text-xl font-semibold text-center" style={{ color: Colors.text }}>
                  Chatly AI Assistant
                </Text>
                <Text className="text-sm text-center mt-2.5 leading-5 max-w-xs" style={{ color: Colors.textMuted }}>
                  Start with a suggested prompt or ask your own question.
                </Text>
                <AssistantQuickChips
                  onChipSelect={handleChipSelect}
                  contextConversationName={contextConversationName}
                  contextMode={contextMode}
                />
              </View>
            ) : (
              <LegendList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListFooterComponent={AssistantListFooter}
                extraData={`${streamingStatus}-${streamingContent.length}-${toolCalls.length}`}
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

          <AssistantMessageActions
            visible={messageActionsVisible}
            onClose={() => setMessageActionsVisible(false)}
            onCopy={() => {
              if (selectedMessage) {
                handleCopy(selectedMessage.content);
              }
            }}
            onForwardToChat={() => {
              if (selectedMessage) {
                setForwardModalVisible(true);
              }
            }}
          />

          <ForwardToChatModal
            visible={forwardModalVisible}
            currentUserId={currentUserId}
            onClose={() => setForwardModalVisible(false)}
            onConfirm={handleForwardToChat}
          />
    </View>
  );
}

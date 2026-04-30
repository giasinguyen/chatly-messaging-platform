import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/theme';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { agentService } from '@/services/agent.service';
import { useChatbotStore } from '@/store/chatbot.store';
import { useAgentStream } from '@/hooks/useAgentStream';
import { AssistantMessageBubble } from '@/components/assistant/AssistantMessageBubble';
import { AssistantComposer } from '@/components/assistant/AssistantComposer';
import { AssistantThinkingIndicator } from '@/components/assistant/AssistantThinkingIndicator';
import { AssistantStreamingBubble } from '@/components/assistant/AssistantStreamingBubble';
import { formatRelativeTime } from '@/utils/format';
import type { AgentSession, AgentMessage } from '@/types/agent';
import { AssistantMessageActions } from '@/components/assistant/AssistantMessageActions';
import { ForwardToChatModal } from '@/components/assistant/ForwardToChatModal';
import { AssistantQuickChips } from '@/components/assistant/AssistantQuickChips';
import { useConversationStore } from '@/store/conversation.store';
import { useAuthStore } from '@/store/auth.store';

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<AgentMessage>>(null);

  const {
    sessions,
    setSessions,
    addSession,
    removeSession,
    renameSession,
    activeSessionId,
    setActiveSessionId,
    messagesBySession,
    setMessages,
    appendMessage,
    streamingStatus,
    streamingContent,
    statusHint,
    resetStreaming,
    useWebSearch,
    selectedMcpIds,
    setLastUserPrompt,
    lastUserPrompt,
    setDraft,
  } = useChatbotStore();

  const conversations = useConversationStore((s) => s.conversations);
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  const { startStream, cancelStream } = useAgentStream();

  const messages = messagesBySession[activeSessionId ?? ''] ?? [];
  const isStreaming = streamingStatus === 'connecting' || streamingStatus === 'streaming';
  const isThinking = streamingStatus === 'connecting' || streamingStatus === 'thinking';
  const hasChat = activeSessionId && messages.length > 0;

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [mcpConfigVisible, setMcpConfigVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);
  const [messageActionsVisible, setMessageActionsVisible] = useState(false);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);

  const session = sessions.find((s) => s.id === activeSessionId);
  const title = session?.title ?? 'AI Assistant';
  const contextConversationName =
    session?.context_conversation_id
      ? conversations.find((conversation) => conversation.id === session.context_conversation_id)?.name ?? 'this group'
      : undefined;

  // ─── Load sessions on mount ──────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const data = await agentService.listSessions();
      setSessions(data.sessions);
    } catch {
      /* silent */
    }
  }, [setSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ─── Load history when activeSessionId changes ───────────
  useEffect(() => {
    if (!activeSessionId) return;

    const fetchHistory = async () => {
      // Only fetch if we don't already have messages cached
      if ((messagesBySession[activeSessionId] ?? []).length > 0) return;
      setLoadingMessages(true);
      try {
        const res = await agentService.getHistory(activeSessionId);
        setMessages(activeSessionId, res.messages);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchHistory();
  }, [activeSessionId, setMessages, messagesBySession]);

  // ─── Auto-scroll ─────────────────────────────────────────
  useEffect(() => {
    if (!showScrollDown && hasChat) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, streamingContent, showScrollDown, hasChat]);

  // ─── Send message ────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      let sid = activeSessionId;

      // Auto-create session if none active
      if (!sid) {
        try {
          const newSession = await agentService.createSession(text.slice(0, 50));
          addSession(newSession);
          sid = newSession.id;
          setActiveSessionId(sid);
        } catch {
          Alert.alert('Error', 'Could not create new conversation');
          return;
        }
      }

      // Append user message optimistically
      const userMsg: AgentMessage = {
        id: `user-${Date.now()}`,
        session_id: sid,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };
      appendMessage(sid, userMsg);
      setLastUserPrompt(text);

      await startStream(sid, {
        message: text,
        file_ids: [],
        use_web_search: useWebSearch,
        mcp_server_ids: selectedMcpIds,
      });
    },
    [activeSessionId, addSession, setActiveSessionId, appendMessage, startStream, useWebSearch, selectedMcpIds, setLastUserPrompt],
  );

  const handleRetry = useCallback(() => {
    if (!lastUserPrompt || !activeSessionId) return;
    const msgs = useChatbotStore.getState().messagesBySession[activeSessionId] ?? [];
    const last = msgs[msgs.length - 1];
    if (last?.role === 'assistant') {
      setMessages(activeSessionId, msgs.filter((m) => m.id !== last.id));
    }
    resetStreaming();
    startStream(activeSessionId, {
      message: lastUserPrompt,
      file_ids: [],
      use_web_search: useWebSearch,
      mcp_server_ids: selectedMcpIds,
    });
  }, [lastUserPrompt, activeSessionId, setMessages, resetStreaming, startStream, useWebSearch, selectedMcpIds]);

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
      router.push(`/chat/${conversationId}?prefill=${encoded}&prefill_token=${token}`);
    },
    [selectedMessage, router],
  );

  const handleChipSelect = useCallback(
    (query: string) => {
      const targetSessionId = activeSessionId ?? '__new__';
      setDraft(targetSessionId, query);
    },
    [activeSessionId, setDraft],
  );

  // ─── New chat ────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    resetStreaming();
    setActiveSessionId(null);
  }, [resetStreaming, setActiveSessionId]);

  // ─── Session list actions ────────────────────────────────
  const handleRefreshSessions = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleSelectSession = (s: AgentSession) => {
    resetStreaming();
    setActiveSessionId(s.id);
    setShowSessions(false);
  };

  const handleDeleteSession = (sessionId: string, sessionTitle: string) => {
    Alert.alert('Delete conversation?', `"${sessionTitle}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await agentService.deleteSession(sessionId);
            removeSession(sessionId);
            if (activeSessionId === sessionId) {
              setActiveSessionId(null);
              resetStreaming();
            }
          } catch {
            Alert.alert('Error', 'Could not delete');
          }
        },
      },
    ]);
  };

  const handleLongPressSession = (s: AgentSession) => {
    Alert.alert(s.title, undefined, [
      {
        text: 'Rename',
        onPress: () => {
          setEditingId(s.id);
          setEditTitle(s.title);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteSession(s.id, s.title),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmRename = async () => {
    if (!editingId || !editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await agentService.renameSession(editingId, editTitle.trim());
      renameSession(editingId, editTitle.trim());
    } catch {
      Alert.alert('Error', 'Could not rename');
    } finally {
      setEditingId(null);
    }
  };

  // ─── Scroll handling ─────────────────────────────────────
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

  // ─── Renderers ───────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item, index }: { item: AgentMessage; index: number }) => {
      const isLastAssistant =
        item.role === 'assistant' &&
        index === messages.length - 1 &&
        streamingStatus === 'error';
      return (
        <AssistantMessageBubble
          message={item}
          sessionId={activeSessionId ?? ''}
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
    [messages.length, streamingStatus, handleRetry, handleCopy],
  );

  const keyExtractor = useCallback((item: AgentMessage) => item.id, []);

  const ListFooter = useCallback(() => {
    if (isThinking) return <AssistantThinkingIndicator hint={statusHint} />;
    if (streamingStatus === 'streaming' && streamingContent)
      return <AssistantStreamingBubble content={streamingContent} />;
    return null;
  }, [isThinking, statusHint, streamingStatus, streamingContent]);

  // ─── Session list item ───────────────────────────────────
  const renderSessionItem = ({ item }: { item: AgentSession }) => {
    const isEditing = editingId === item.id;
    const isActive = activeSessionId === item.id;
    const isContextSession = !!item.context_conversation_id;
    return (
      <TouchableOpacity
        onPress={() => handleSelectSession(item)}
        onLongPress={() => handleLongPressSession(item)}
        activeOpacity={0.7}
        className="flex-row items-center px-4 py-3.5"
        style={{
          backgroundColor: isActive ? Colors.ctaLight : Colors.white,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View
          className="h-10 w-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: isActive ? Colors.cta : isContextSession ? '#EEF2FF' : Colors.ctaLight }}
        >
          <CustomAiIcon size={18} color={isActive ? Colors.white : isContextSession ? '#4338CA' : Colors.cta} />
        </View>
        <View className="ml-3 flex-1">
          {isEditing ? (
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              onSubmitEditing={confirmRename}
              onBlur={confirmRename}
              autoFocus
              selectTextOnFocus
              className="text-[15px] font-semibold"
              style={{ color: Colors.text, borderBottomWidth: 1, borderBottomColor: Colors.cta, paddingVertical: 2 }}
            />
          ) : (
            <Text className="text-[15px] font-semibold" style={{ color: Colors.text }} numberOfLines={1}>
              {item.title}
            </Text>
          )}
          <Text className="text-xs mt-0.5" style={{ color: Colors.textMuted }}>
            {formatRelativeTime(item.updated_at || item.created_at)}
          </Text>
          {isContextSession && (
            <View className="self-start rounded-full px-2 py-0.5 mt-1" style={{ backgroundColor: '#EEF2FF' }}>
              <Text className="text-[10px] font-medium" style={{ color: '#4338CA' }}>
                Group
              </Text>
            </View>
          )}
        </View>
        {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.cta} />}
      </TouchableOpacity>
    );
  };

  // ─── UI ──────────────────────────────────────────────────
  return (
    <View className="flex-1" style={{ backgroundColor: Colors.white, paddingTop: insets.top }}>
      {/* ── Header ── */}
      <View
        className="flex-row items-center justify-between px-4 pb-2.5 pt-2"
        style={{ backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
      >
        <View className="flex-row items-center flex-1">
          <View className="h-8 w-8 rounded-lg items-center justify-center" style={{ backgroundColor: Colors.ctaLight }}>
            <CustomAiIcon size={16} color={Colors.cta} />
          </View>
          <View className="ml-2.5 flex-1">
            <Text className="text-lg font-bold" style={{ color: Colors.text }} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <TouchableOpacity
            onPress={() => setMcpConfigVisible(true)}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.cta} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              loadSessions();
              setShowSessions(true);
            }}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="time-outline" size={22} color={Colors.cta} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNewChat}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="create-outline" size={22} color={Colors.cta} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body ── */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.bottom}
      >
        <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
          {loadingMessages ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={Colors.cta} />
            </View>
          ) : hasChat ? (
            /* ── Chat view ── */
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                ListFooterComponent={ListFooter}
                onScroll={handleScroll}
                scrollEventThrottle={100}
                contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              />
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
            </>
          ) : (
            /* ── Empty state ── */
            <View className="flex-1 items-center justify-center px-8">
              <View className="h-20 w-20 rounded-2xl items-center justify-center mb-5" style={{ backgroundColor: Colors.ctaLight }}>
                <CustomAiIcon size={36} color={Colors.cta} />
              </View>
              <Text className="text-xl font-semibold text-center" style={{ color: Colors.text }}>
                Chatly AI Assistant
              </Text>
              <Text className="text-sm text-center mt-2.5 leading-5 max-w-xs" style={{ color: Colors.textMuted }}>
                Enter a question to start chatting with AI.{'\n'}
                You can upload documents, search the web and use MCP tools.
              </Text>
              <AssistantQuickChips
                onChipSelect={handleChipSelect}
                contextConversationName={contextConversationName}
              />
            </View>
          )}
        </View>

        {/* ── Composer ── */}
        <AssistantComposer
          sessionId={activeSessionId ?? '__new__'}
          onSend={handleSend}
          isStreaming={isStreaming}
          onCancel={cancelStream}
          disabled={isStreaming}
          mcpConfigVisible={mcpConfigVisible}
          onMcpConfigChange={setMcpConfigVisible}
        />
        <View style={{ height: insets.bottom, backgroundColor: Colors.white }} />
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* ── Session List Modal ── */}
      <Modal visible={showSessions} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
          {/* Modal header */}
          <View
            className="flex-row items-center justify-between px-4 pb-3 pt-2"
            style={{ backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
          >
            <Text className="text-lg font-bold" style={{ color: Colors.text }}>
              Chat History
            </Text>
            <TouchableOpacity onPress={() => setShowSessions(false)} className="p-1">
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Sessions */}
          <FlatList
            data={sessions}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefreshSessions} tintColor={Colors.cta} />
            }
            contentContainerStyle={sessions.length === 0 ? { flex: 1 } : undefined}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
                <Text className="text-sm mt-3" style={{ color: Colors.textMuted }}>
                  No conversations yet
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

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

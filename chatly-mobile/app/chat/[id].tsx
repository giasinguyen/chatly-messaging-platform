import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { MessageActions } from '@/components/chat/MessageActions';
import { ForwardMessageModal } from '@/components/chat/ForwardMessageModal';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { messageService } from '@/services/message.service';
import { conversationService } from '@/services/conversation.service';
import { userService } from '@/services/user.service';
import { useMessageStore } from '@/store/message.store';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { useChatSocket } from '@/hooks/useChatSocket';
import { usePresenceSocket } from '@/hooks/usePresenceSocket';
import { Colors } from '@/constants/theme';
import { formatDateSeparator } from '@/utils/format';
import type { Message, ChatEvent, Attachment } from '@/types/message';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';

const PAGE_SIZE = 20;

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const flatListRef = useRef<FlatList>(null);

  const {
    messagesByConversation,
    setMessages,
    appendOlderMessages,
    addMessage,
    updateMessage,
    removeMessage,
    loadingMessages,
    setLoadingMessages,
    hasMore,
    setHasMore,
    page,
    setPage,
  } = useMessageStore();

  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [participantMap, setParticipantMap] = useState<Record<string, UserResponse>>({});
  const [userDirectory, setUserDirectory] = useState<Record<string, UserResponse>>({});
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [forwardVisible, setForwardVisible] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messages = messagesByConversation[conversationId ?? ''] ?? [];
  const currentPage = page[conversationId ?? ''] ?? 0;
  const canLoadMore = hasMore[conversationId ?? ''] ?? true;

  const { updateConversation } = useConversationStore();

  const handleChatEvent = useCallback(
    (event: ChatEvent) => {
      if (!conversationId) return;
      switch (event.action) {
        case 'SEND':
          addMessage(conversationId, event.message);
          
          // Update conversation list preview
          updateConversation(conversationId, {
            lastMessage: {
              senderId: event.message.senderId,
              content: event.message.content,
              type: event.message.type,
              timestamp: event.message.createdAt,
            },
          });

          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          break;
        case 'EDIT':
        case 'RECALL':
        case 'REACT':
          updateMessage(conversationId, event.message.id, event.message);
          break;
        case 'DELETE':
          removeMessage(conversationId, event.message.id);
          break;
      }
    },
    [conversationId, addMessage, updateMessage, removeMessage, updateConversation],
  );

  const handleTyping = useCallback(
    (data: { userId: string; typing: boolean }) => {
      if (data.userId === user?.id) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.typing) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    },
    [user?.id],
  );

  const handleRead = useCallback(
    (msg: Message) => {
      if (!conversationId) return;
      updateMessage(conversationId, msg.id, msg);
    },
    [conversationId, updateMessage],
  );

  // Presence tracking for 1-1 chats
  const otherUserId = useMemo(() => {
    if (!conversation || conversation.type === 'GROUP') return null;
    return conversation.participantIds.find((pid) => pid !== user?.id) ?? null;
  }, [conversation, user?.id]);

  // Initialize online status from fetched participant data
  useEffect(() => {
    if (otherUserId && participantMap[otherUserId]) {
      setOtherUserOnline(participantMap[otherUserId].status === 'ONLINE');
    }
  }, [otherUserId, participantMap]);

  usePresenceSocket({
    onPresenceChange: (event) => {
      if (event.userId === otherUserId) {
        setOtherUserOnline(event.status === 'ONLINE');
      }
    },
  });

  const { sendMessage: wsSendMessage, sendTyping, sendSeen } = useChatSocket({
    conversationId: conversationId ?? '',
    onEvent: handleChatEvent,
    onTyping: handleTyping,
    onRead: handleRead,
  });

  const { setActiveConversation } = useConversationStore();

  // Fetch conversation details
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);

    const fetchDetails = async () => {
      try {
        const res = await conversationService.getById(conversationId);
        setConversation(res.result);

        // Fetch participant info
        const usersRes = await userService.getAll();
        const fullUserMap: Record<string, UserResponse> = {};
        usersRes.result.forEach((u) => {
          fullUserMap[u.id] = u;
        });
        setUserDirectory(fullUserMap);
        const map: Record<string, UserResponse> = {};
        usersRes.result.forEach((u) => {
          if (res.result.participantIds.includes(u.id)) {
            map[u.id] = u;
          }
        });
        setParticipantMap(map);
      } catch (error) {
        console.error('Failed to fetch conversation:', error);
      }
    };

    fetchDetails();

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation]);

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await messageService.getByConversation(conversationId, 0, PAGE_SIZE);
        // API returns newest first, reverse for display (oldest → newest)
        const reversed = [...res.result].reverse();
        setMessages(conversationId, reversed);
        setPage(conversationId, 0);
        setHasMore(conversationId, res.result.length >= PAGE_SIZE);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [conversationId, setMessages, setLoadingMessages, setPage, setHasMore]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!conversationId || !canLoadMore || loadingMessages) return;

    const nextPage = currentPage + 1;
    setLoadingMessages(true);
    try {
      const res = await messageService.getByConversation(conversationId, nextPage, PAGE_SIZE);
      const reversed = [...res.result].reverse();
      appendOlderMessages(conversationId, reversed);
      setPage(conversationId, nextPage);
      setHasMore(conversationId, res.result.length >= PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId, canLoadMore, loadingMessages, currentPage, appendOlderMessages, setPage, setHasMore, setLoadingMessages]);

  // Build message lookup map for reply previews
  const messageById = useMemo(() => {
    const map: Record<string, Message> = {};
    messages.forEach((m) => { map[m.id] = m; });
    return map;
  }, [messages]);

  // Send message (try WebSocket, fallback to REST)
  const handleSend = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      if (!conversationId || !user) return;
      const replyToId = replyingTo?.id ?? null;
      const hasAttachments = attachments && attachments.length > 0;
      const msgType = hasAttachments
        ? attachments[0].type?.startsWith('image/') ? 'IMAGE'
          : attachments[0].type?.startsWith('video/') ? 'VIDEO'
          : attachments[0].type?.startsWith('audio/') ? 'AUDIO'
          : 'FILE'
        : 'TEXT';

      const optimisticLastMsg = {
        senderId: user.id,
        content: text || (hasAttachments ? `[${msgType}]` : ''),
        type: msgType as 'TEXT',
        timestamp: new Date().toISOString(),
      };

      // Try WebSocket first
      const sent = wsSendMessage(text, replyToId, attachments);
      if (sent) {
        updateConversation(conversationId, { lastMessage: optimisticLastMsg });
        setReplyingTo(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        return;
      }

      // Fallback to REST
      try {
        const res = await messageService.send({
          conversationId,
          content: text,
          type: msgType,
          replyToId,
          attachments,
        });
        addMessage(conversationId, res.result);
        updateConversation(conversationId, { 
          lastMessage: {
            senderId: res.result.senderId,
            content: res.result.content,
            type: res.result.type,
            timestamp: res.result.createdAt,
          } 
        });
        setReplyingTo(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    },
    [conversationId, user, replyingTo, wsSendMessage, addMessage, updateConversation],
  );

  // Message actions
  const handleLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    setActionsVisible(true);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!selectedMessage) return;
    // Clipboard copy - no external dependency needed
    Alert.alert('Đã sao chép', selectedMessage.content);
  }, [selectedMessage]);

  const handleEdit = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    // Simple prompt for edit
    Alert.prompt?.(
      'Chỉnh sửa tin nhắn',
      '',
      async (newContent: string) => {
        if (!newContent?.trim()) return;
        try {
          const res = await messageService.edit(selectedMessage.id, newContent.trim());
          updateMessage(conversationId, selectedMessage.id, res.result);
        } catch (error: any) {
          Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể chỉnh sửa.');
        }
      },
      'plain-text',
      selectedMessage.content,
    );
  }, [selectedMessage, conversationId, updateMessage]);

  const handleRecall = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    Alert.alert('Thu hồi tin nhắn', 'Bạn có chắc muốn thu hồi tin nhắn này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await messageService.recall(selectedMessage.id);
            updateMessage(conversationId, selectedMessage.id, res.result);
          } catch (error: any) {
            Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể thu hồi.');
          }
        },
      },
    ]);
  }, [selectedMessage, conversationId, updateMessage]);

  const handleDelete = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    Alert.alert('Xoá tin nhắn', 'Bạn có chắc muốn xoá tin nhắn này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await messageService.delete(selectedMessage.id);
            removeMessage(conversationId, selectedMessage.id);
          } catch (error: any) {
            Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể xoá.');
          }
        },
      },
    ]);
  }, [selectedMessage, conversationId, removeMessage]);

  const handleForward = useCallback(async (targetConversationIds: string[]) => {
    if (!selectedMessage) return;

    try {
      await messageService.forward(selectedMessage.id, targetConversationIds);
      setForwardVisible(false);
      setSelectedMessage(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể chuyển tiếp tin nhắn.');
      throw error;
    }
  }, [selectedMessage]);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!conversationId || !user) return;
      try {
        const res = await messageService.react(messageId, emoji);
        updateMessage(conversationId, messageId, res.result);
      } catch {
        Alert.alert('Lỗi', 'Không thể bày tỏ cảm xúc.');
      }
    },
    [conversationId, user, updateMessage],
  );

  // Build display data with date separators
  const displayData = useMemo(() => {
    const items: Array<{ type: 'date'; label: string } | { type: 'message'; data: Message }> = [];
    let lastDateLabel = '';

    messages.forEach((msg) => {
      const dateLabel = formatDateSeparator(msg.createdAt);
      if (dateLabel !== lastDateLabel) {
        items.push({ type: 'date', label: dateLabel });
        lastDateLabel = dateLabel;
      }
      items.push({ type: 'message', data: msg });
    });

    return items;
  }, [messages]);

  const handleNavigateToMessage = useCallback(
    (messageId: string) => {
      setHighlightedMessageId(messageId);
      const idx = displayData.findIndex(
        (item) => item.type === 'message' && item.data.id === messageId,
      );
      if (idx >= 0) {
        flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      }
      setTimeout(() => setHighlightedMessageId(null), 2000);
    },
    [displayData],
  );

  // Resolve chat header info
  const isGroup = conversation?.type === 'GROUP';
  let chatName = conversation?.name ?? 'Cuộc trò chuyện';
  let chatAvatar = conversation?.avatarUrl;

  if (!isGroup && conversation) {
    const otherId = conversation.participantIds.find((id) => id !== user?.id);
    if (otherId && participantMap[otherId]) {
      chatName = participantMap[otherId].displayName;
      chatAvatar = participantMap[otherId].avatarUrl;
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ backgroundColor: Colors.white }}
    >
      {/* Header */}
      <ChatHeader
        name={chatName}
        avatarUrl={chatAvatar}
        isGroup={isGroup}
        memberCount={conversation?.participantIds.length}
        isOnline={!isGroup && otherUserOnline}
        onToggleSearch={() => {
          setShowSearch((prev) => !prev);
          if (showSearch) setHighlightedMessageId(null);
        }}
        onPressInfo={() => router.push(`/chat/${conversationId}/info`)}
      />

      {showSearch && conversationId && (
        <MessageSearch
          conversationId={conversationId}
          onClose={() => {
            setShowSearch(false);
            setHighlightedMessageId(null);
          }}
          onNavigateToMessage={handleNavigateToMessage}
        />
      )}

      {/* Messages */}
      <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
        {loadingMessages && messages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.cta} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayData}
            keyExtractor={(item, index) =>
              item.type === 'date' ? `date-${item.label}-${index}` : `msg-${item.data.id}`
            }
            renderItem={({ item }) => {
              if (item.type === 'date') {
                return <DateSeparator label={item.label} />;
              }
              const msg = item.data;
              const isMe = msg.senderId === user?.id;
              const sender = participantMap[msg.senderId];
              const isHighlighted = highlightedMessageId === msg.id;
              return (
                <View style={isHighlighted ? { backgroundColor: 'rgba(234,179,8,0.15)', borderRadius: 12 } : undefined}>
                  <MessageBubble
                    message={msg}
                    isMe={isMe}
                    showAvatar={isGroup}
                    senderName={sender?.displayName}
                    currentUserId={user?.id}
                    onLongPress={() => handleLongPress(msg)}
                    onReact={handleReact}
                    replyToMessage={msg.replyToId ? (messageById[msg.replyToId] ?? null) : null}
                  />
                </View>
              );
            }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            inverted={false}
            onContentSizeChange={() => {
              if (messages.length > 0 && currentPage === 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListHeaderComponent={
              canLoadMore && loadingMessages ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color={Colors.cta} />
                </View>
              ) : null
            }
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: 8,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <TypingIndicator
          name={
            typingUsers.size === 1
              ? participantMap[Array.from(typingUsers)[0]]?.displayName
              : undefined
          }
        />
      )}

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput
          conversationId={conversationId}
          onSend={handleSend}
          onTyping={sendTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </View>

      {/* Message Actions Bottom Sheet */}
      <MessageActions
        visible={actionsVisible}
        message={selectedMessage}
        isMe={selectedMessage?.senderId === user?.id}
        onClose={() => setActionsVisible(false)}
        onReply={() => {
          if (selectedMessage) setReplyingTo(selectedMessage);
          setActionsVisible(false);
        }}
        onForward={() => {
          setForwardVisible(true);
          setActionsVisible(false);
        }}
        onCopy={handleCopy}
        onReact={selectedMessage ? (emoji: string) => handleReact(selectedMessage.id, emoji) : undefined}
        onEdit={handleEdit}
        onRecall={handleRecall}
        onDelete={handleDelete}
      />

      <ForwardMessageModal
        visible={forwardVisible}
        currentConversationId={conversationId ?? ''}
        currentUserId={user?.id ?? ''}
        onClose={() => setForwardVisible(false)}
        onConfirm={handleForward}
      />
    </KeyboardAvoidingView>
  );
}

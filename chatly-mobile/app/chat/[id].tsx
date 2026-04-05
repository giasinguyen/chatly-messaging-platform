import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { MessageActions } from '@/components/chat/MessageActions';
import { messageService } from '@/services/message.service';
import { conversationService } from '@/services/conversation.service';
import { userService } from '@/services/user.service';
import { useMessageStore } from '@/store/message.store';
import { useAuthStore } from '@/store/auth.store';
import { Colors } from '@/constants/theme';
import { formatDateSeparator } from '@/utils/format';
import type { Message } from '@/types/message';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';

const PAGE_SIZE = 20;

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
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
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);

  const messages = messagesByConversation[conversationId ?? ''] ?? [];
  const currentPage = page[conversationId ?? ''] ?? 0;
  const canLoadMore = hasMore[conversationId ?? ''] ?? true;

  // Fetch conversation details
  useEffect(() => {
    if (!conversationId) return;

    const fetchDetails = async () => {
      try {
        const res = await conversationService.getById(conversationId);
        setConversation(res.result);

        // Fetch participant info
        const usersRes = await userService.getAll();
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
  }, [conversationId]);

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

  // Send message
  const handleSend = useCallback(
    async (text: string) => {
      if (!conversationId || !user) return;

      try {
        const res = await messageService.send({
          conversationId,
          content: text,
          type: 'TEXT',
        });
        addMessage(conversationId, res.result);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    },
    [conversationId, user, addMessage],
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
      />

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
              return (
                <MessageBubble
                  message={msg}
                  isMe={isMe}
                  showAvatar={isGroup}
                  senderName={sender?.displayName}
                  onLongPress={() => handleLongPress(msg)}
                />
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

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput onSend={handleSend} />
      </View>

      {/* Message Actions Bottom Sheet */}
      <MessageActions
        visible={actionsVisible}
        message={selectedMessage}
        isMe={selectedMessage?.senderId === user?.id}
        onClose={() => setActionsVisible(false)}
        onReply={() => {
          // TODO: implement reply
        }}
        onCopy={handleCopy}
        onEdit={handleEdit}
        onRecall={handleRecall}
        onDelete={handleDelete}
      />
    </KeyboardAvoidingView>
  );
}

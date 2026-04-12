import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  Image,
  TouchableOpacity,
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
import { contactService } from '@/services/contact.service';
import { useMessageStore } from '@/store/message.store';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useCallSocket } from '@/hooks/useCallSocket';
import { usePresenceSocket } from '@/hooks/usePresenceSocket';
import { Colors } from '@/constants/theme';
import { formatDateSeparator } from '@/utils/format';
import type { Message, ChatEvent, Attachment } from '@/types/message';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';
import type { ContactResponse } from '@/types/contact';
import { Ionicons } from '@expo/vector-icons';

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
  const [highlightKeyword, setHighlightKeyword] = useState('');
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [mentionModalUser, setMentionModalUser] = useState<UserResponse | null>(null);
  const [showMentionModal, setShowMentionModal] = useState(false);

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

  const { initiateCall } = useCallSocket();

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

        // Fetch contacts for friend status
        try {
          const contactsRes = await contactService.getAll();
          setContacts(contactsRes.result ?? []);
        } catch { /* ignore */ }
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
    async (text: string, attachments?: Attachment[], messageType?: string, priority?: 'IMPORTANT' | 'URGENT') => {
      if (!conversationId || !user) return;
      const replyToId = replyingTo?.id ?? null;
      const hasAttachments = attachments && attachments.length > 0;
      const msgType = messageType ?? (hasAttachments
        ? attachments[0].type?.startsWith('image/') ? 'IMAGE'
          : attachments[0].type?.startsWith('video/') ? 'VIDEO'
          : attachments[0].type?.startsWith('audio/') ? 'AUDIO'
          : 'FILE'
        : 'TEXT');

      const optimisticLastMsg = {
        senderId: user.id,
        content: text || (hasAttachments ? `[${msgType}]` : ''),
        type: msgType as 'TEXT',
        timestamp: new Date().toISOString(),
      };

      // Try WebSocket first
      const sent = wsSendMessage(text, replyToId, attachments, messageType, priority);
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
          priority,
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
        Alert.alert('Error', 'Could not send message. Please try again.');
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
    Alert.alert('Copied', selectedMessage.content);
  }, [selectedMessage]);

  const handleEdit = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    // Simple prompt for edit
    Alert.prompt?.(
      'Edit Message',
      '',
      async (newContent: string) => {
        if (!newContent?.trim()) return;
        try {
          const res = await messageService.edit(selectedMessage.id, newContent.trim());
          updateMessage(conversationId, selectedMessage.id, res.result);
        } catch (error: any) {
          Alert.alert('Error', error?.response?.data?.message ?? 'Could not edit message.');
        }
      },
      'plain-text',
      selectedMessage.content,
    );
  }, [selectedMessage, conversationId, updateMessage]);

  const handleRecall = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    Alert.alert('Recall Message', 'Are you sure you want to recall this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Recall',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await messageService.recall(selectedMessage.id);
            updateMessage(conversationId, selectedMessage.id, res.result);
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message ?? 'Could not recall message.');
          }
        },
      },
    ]);
  }, [selectedMessage, conversationId, updateMessage]);

  const handleDelete = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await messageService.delete(selectedMessage.id);
            removeMessage(conversationId, selectedMessage.id);
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message ?? 'Could not delete message.');
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
      Alert.alert('Error', error?.response?.data?.message ?? 'Could not forward message.');
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
        Alert.alert('Error', 'Could not react to message.');
      }
    },
    [conversationId, user, updateMessage],
  );

  const handleVotePoll = useCallback(
    async (messageId: string, optionIndex: number) => {
      if (!conversationId || !user) return;
      try {
        const res = await messageService.votePoll(messageId, optionIndex);
        updateMessage(conversationId, messageId, res.result);
      } catch {
        Alert.alert('Error', 'Could not vote.');
      }
    },
    [conversationId, user, updateMessage],
  );

  const handleTogglePin = useCallback(
    async (messageId: string) => {
      if (!conversationId || !user) return;
      try {
        const res = await messageService.togglePin(messageId);
        updateMessage(conversationId, messageId, res.result);
      } catch {
        Alert.alert('Error', 'Could not pin message.');
      }
    },
    [conversationId, user, updateMessage],
  );

  const handleCallAgain = useCallback(
    (calleeId: string, calleeName: string, calleeAvatar?: string) => {
      initiateCall(calleeId, conversationId ?? '', 'VOICE', calleeName, calleeAvatar);
    },
    [conversationId, initiateCall],
  );

  const handleMentionPress = useCallback(
    (displayName: string) => {
      // Find user by displayName in participantMap
      const foundUser = Object.values(participantMap).find(
        (u) => u.displayName === displayName,
      );
      if (foundUser) {
        setMentionModalUser(foundUser);
        setShowMentionModal(true);
      }
    },
    [participantMap],
  );

  const handleAddFriend = useCallback(
    async (contactId: string) => {
      try {
        await contactService.sendRequest({ contactId });
        // Refresh contacts
        const res = await contactService.getAll();
        setContacts(res.result ?? []);
        Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
      } catch {
        Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn');
      }
    },
    [],
  );

  const getMentionFriendStatus = useCallback(
    (userId: string) => {
      if (userId === user?.id) return 'SELF';
      const contact = contacts.find(
        (c) => c.contact.id === userId || c.user.id === userId,
      );
      return contact?.status ?? null;
    },
    [contacts, user?.id],
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
  let chatName = conversation?.name ?? 'Conversation';
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
        conversationId={conversationId}
        receiverId={otherUserId ?? undefined}
        onToggleSearch={() => {
          setShowSearch((prev) => !prev);
          if (showSearch) {
            setHighlightedMessageId(null);
            setHighlightKeyword('');
          }
        }}
        onPressInfo={() => router.push(`/chat/${conversationId}/info`)}
      />

      {showSearch && conversationId && (
        <MessageSearch
          conversationId={conversationId}
          onClose={() => {
            setShowSearch(false);
            setHighlightedMessageId(null);
            setHighlightKeyword('');
          }}
          onNavigateToMessage={handleNavigateToMessage}
          onKeywordChange={setHighlightKeyword}
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
                    senderAvatarUrl={isGroup ? sender?.avatarUrl : undefined}
                    currentUserId={user?.id}
                    onLongPress={() => handleLongPress(msg)}
                    onReact={handleReact}
                    onVotePoll={handleVotePoll}
                    replyToMessage={msg.replyToId ? (messageById[msg.replyToId] ?? null) : null}
                    onCallAgain={handleCallAgain}
                    calleeInfo={isMe ? null : { id: msg.senderId, name: sender?.displayName ?? 'User', avatar: sender?.avatarUrl }}
                    highlightKeyword={highlightKeyword}
                    onMentionPress={isGroup ? handleMentionPress : undefined}
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
          isGroup={isGroup}
          groupMembers={
            isGroup
              ? Object.values(participantMap)
                  .filter((m) => m.id !== user?.id)
                  .map((m) => ({
                    id: m.id,
                    displayName: m.displayName,
                    username: m.username ?? '',
                    avatarUrl: m.avatarUrl,
                  }))
              : undefined
          }
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
        onTogglePin={selectedMessage ? () => {
          handleTogglePin(selectedMessage.id);
          setActionsVisible(false);
        } : undefined}
      />

      <ForwardMessageModal
        visible={forwardVisible}
        currentConversationId={conversationId ?? ''}
        currentUserId={user?.id ?? ''}
        onClose={() => setForwardVisible(false)}
        onConfirm={handleForward}
      />

      {/* Mention user info modal */}
      <Modal
        visible={showMentionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMentionModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowMentionModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              width: 280,
              overflow: 'hidden',
            }}
            onPress={() => {}}
          >
            {mentionModalUser && (() => {
              const friendStatus = getMentionFriendStatus(mentionModalUser.id);
              return (
                <>
                  {/* Avatar & info */}
                  <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.cta, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 }}>
                      {mentionModalUser.avatarUrl ? (
                        <Image source={{ uri: mentionModalUser.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                      ) : (
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                          {mentionModalUser.displayName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' }}>
                      {mentionModalUser.displayName}
                    </Text>
                    {mentionModalUser.username ? (
                      <Text style={{ fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>
                        @{mentionModalUser.username}
                      </Text>
                    ) : null}
                  </View>

                  {/* Friend status action */}
                  <View style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)', paddingVertical: 12, paddingHorizontal: 20 }}>
                    {friendStatus === 'SELF' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                        <Ionicons name="person" size={16} color={Colors.textMuted} />
                        <Text style={{ fontSize: 13, color: Colors.textMuted, marginLeft: 6 }}>Đây là bạn</Text>
                      </View>
                    ) : friendStatus === 'ACCEPTED' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '600', marginLeft: 6 }}>Bạn bè</Text>
                      </View>
                    ) : friendStatus === 'PENDING' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                        <Ionicons name="time-outline" size={16} color="#d97706" />
                        <Text style={{ fontSize: 13, color: '#d97706', fontWeight: '600', marginLeft: 6 }}>Đã gửi lời mời</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          handleAddFriend(mentionModalUser.id);
                          setShowMentionModal(false);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: Colors.cta,
                          paddingVertical: 10,
                          borderRadius: 12,
                        }}
                      >
                        <Ionicons name="person-add" size={16} color="#fff" />
                        <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600', marginLeft: 6 }}>Kết bạn</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Close button */}
                  <TouchableOpacity
                    onPress={() => setShowMentionModal(false)}
                    style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)', paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, color: Colors.textMuted }}>Đóng</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

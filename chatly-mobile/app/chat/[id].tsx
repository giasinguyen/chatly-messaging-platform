import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBanner } from '@/components/chat/PinnedMessagesBanner';
import { ActivePollBanner } from '@/components/chat/ActivePollBanner';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { MessageActions } from '@/components/chat/MessageActions';
import { ForwardMessageModal } from '@/components/chat/ForwardMessageModal';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { TextRichComposer, type ComposerMode } from '@/components/chat/TextRichComposer';
import { messageService } from '@/services/message.service';
import { conversationService } from '@/services/conversation.service';
import { contactService } from '@/services/contact.service';
import { userService } from '@/services/user.service';
import { agentService } from '@/services/agent.service';
import { useMessageStore } from '@/store/message.store';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { useContactStore } from '@/store/contact.store';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useCallContext } from '@/contexts/CallContext';
import { useCallStore } from '@/store/call.store';
import { useThemeStore } from '@/store/theme.store';
import { useNotificationStore } from '@/store/notification.store';
import { usePresenceSocket } from '@/hooks/usePresenceSocket';
import { Colors } from '@/constants/theme';
import { formatDateSeparator, isRichTextHtml, richTextToPlainText } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/errorHandler';
import type { Message, ChatEvent, Attachment, Poll, LocationPayload } from '@/types/message';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';
import type { ContactResponse } from '@/types/contact';
import type { CallMediaProvider } from '@/types/call';

const PAGE_SIZE = 20;
const ENDED_CALL_STATUSES = new Set(['ENDED', 'MISSED', 'REJECTED']);

interface CallMessagePayload {
  callId?: string;
  status?: string;
  callType?: string;
  mediaProvider?: CallMediaProvider;
}

function parseCallMessagePayload(rawContent: string): CallMessagePayload | null {
  try {
    return JSON.parse(rawContent) as CallMessagePayload;
  } catch {
    return null;
  }
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const {
    id: conversationId,
    prefill,
    prefill_token,
    returnTo,
  } = useLocalSearchParams<{
    id: string;
    prefill?: string;
    prefill_token?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useThemeStore((state) => state.isDarkMode);
  const user = useAuthStore((s) => s.user);
  const flatListRef = useRef<FlatList>(null);
  // Guard: don't trigger loadMore until the initial page has fully loaded
  const initialLoadDoneRef = useRef(false);
  const shouldScrollToLatestRef = useRef(false);

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
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);
  const [blockDirection, setBlockDirection] = useState<'I_BLOCKED' | 'BLOCKED_ME' | null>(null);
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [mentionModalUser, setMentionModalUser] = useState<UserResponse | null>(null);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<ComposerMode>('plain');
  const [editPlainDraft, setEditPlainDraft] = useState('');
  const [editRichDraft, setEditRichDraft] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [currentPinnedIdx, setCurrentPinnedIdx] = useState(0);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [currentPollIdx, setCurrentPollIdx] = useState(0);
  const [isPollBannerDismissed, setIsPollBannerDismissed] = useState(false);
  const [activePrefillToken, setActivePrefillToken] = useState<string | undefined>(prefill_token);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setAndroidKeyboardInset(Math.max(0, event.endCoordinates.height - insets.bottom));
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);
  const sendSeenRef = useRef<(messageId: string) => boolean>(() => false);

  useEffect(() => {
    if (prefill_token) {
      setActivePrefillToken(prefill_token);
    }
  }, [prefill_token]);

  const decodedPrefillText = useMemo(() => {
    if (!prefill) return undefined;
    try {
      return decodeURIComponent(prefill);
    } catch {
      return prefill;
    }
  }, [prefill]);

  const {
    getBlockDirection,
    fetchContacts,
    loaded: contactsLoaded,
    invalidate: invalidateContacts,
  } = useContactStore();

  const messages = useMemo(
    () => messagesByConversation[conversationId ?? ''] ?? [],
    [conversationId, messagesByConversation]
  );
  const endedGroupCallIds = useMemo(() => {
    const endedCallIds = new Set<string>();

    messages.forEach((message) => {
      if (message.type !== 'CALL') return;

      const payload = parseCallMessagePayload(message.content);
      const status = (payload?.status ?? '').toUpperCase();
      if (payload?.callId && ENDED_CALL_STATUSES.has(status)) {
        endedCallIds.add(payload.callId);
      }
    });

    return endedCallIds;
  }, [messages]);
  const currentPage = page[conversationId ?? ''] ?? 0;
  const canLoadMore = hasMore[conversationId ?? ''] ?? true;

  const { updateConversation, removeConversation } = useConversationStore();

  const scrollToLatestMessage = useCallback((animated: boolean) => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
    shouldScrollToLatestRef.current = false;
  }, []);

  const handleMessagesContentSizeChange = useCallback(() => {
    if (shouldScrollToLatestRef.current) {
      scrollToLatestMessage(true);
    }
  }, [scrollToLatestMessage]);

  const latestMessageId = messages[0]?.id;

  useEffect(() => {
    if (!latestMessageId || !shouldScrollToLatestRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollToLatestMessage(true);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [latestMessageId, scrollToLatestMessage]);

  const handleChatEvent = useCallback(
    (event: ChatEvent) => {
      if (!conversationId) return;
      switch (event.action) {
        case 'SEND':
          if (!event.message) return;
          shouldScrollToLatestRef.current = true;
          addMessage(conversationId, event.message);

          // Mark as seen if not from current user
          if (event.message.senderId !== user?.id) {
            sendSeenRef.current(event.message.id);
          }

          // Update conversation list preview
          updateConversation(conversationId, {
            lastMessage: {
              senderId: event.message.senderId,
              content: event.message.content,
              type: event.message.type,
              timestamp: event.message.createdAt,
            },
          });

          break;
        case 'EDIT':
        case 'RECALL':
        case 'REACT':
          if (!event.message) return;
          const updatedMessage = event.message;
          updateMessage(conversationId, updatedMessage.id, updatedMessage);
          // Sync pinned messages list when pin status changes
          if (updatedMessage.pinned !== undefined) {
            setPinnedMessages((prev) => {
              const exists = prev.some((m) => m.id === updatedMessage.id);
              if (updatedMessage.pinned && !exists) {
                return [...prev, updatedMessage];
              }
              if (!updatedMessage.pinned && exists) {
                return prev.filter((m) => m.id !== updatedMessage.id);
              }
              if (exists) {
                return prev.map((m) =>
                  m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
                );
              }
              return prev;
            });
          }
          break;
        case 'DELETE':
          if (!event.message) return;
          removeMessage(conversationId, event.message.id);
          break;
        case 'GROUP_DISSOLVED':
          removeConversation(conversationId);
          router.dismissAll();
          break;
        case 'GROUP_UPDATE':
        case 'ROLE_UPDATED':
          if (event.conversationData) {
            setConversation(event.conversationData);
            updateConversation(conversationId, event.conversationData);
          }
          break;
      }
    },
    [
      conversationId,
      user?.id,
      addMessage,
      updateMessage,
      removeMessage,
      updateConversation,
      removeConversation,
      router,
    ]
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
    [user?.id]
  );

  const handleRead = useCallback(
    (msg: Message) => {
      if (!conversationId) return;
      updateMessage(conversationId, msg.id, msg);
    },
    [conversationId, updateMessage]
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

  // Compute block direction once contacts are loaded and otherUserId is known
  useEffect(() => {
    if (!user?.id || !otherUserId) return;
    if (!contactsLoaded) {
      fetchContacts();
      return;
    }
    setBlockDirection(getBlockDirection(user.id, otherUserId));
  }, [user?.id, otherUserId, contactsLoaded, fetchContacts, getBlockDirection]);

  usePresenceSocket({
    onPresenceChange: (event) => {
      if (event.userId === otherUserId) {
        setOtherUserOnline(event.status === 'ONLINE');
      }
    },
  });

  const { initiateCall, joinGroupCall } = useCallContext();

  const {
    sendMessage: wsSendMessage,
    sendTyping,
    sendSeen,
  } = useChatSocket({
    conversationId: conversationId ?? '',
    onEvent: handleChatEvent,
    onTyping: handleTyping,
    onRead: handleRead,
  });

  // Keep ref up to date so handleChatEvent can call sendSeen
  sendSeenRef.current = sendSeen;

  const { setActiveConversation } = useConversationStore();
  const removeNotificationByReference = useNotificationStore((s) => s.removeByTypeAndReference);

  // Fetch conversation details
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);
    removeNotificationByReference('NEW_MESSAGE', conversationId);

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
        } catch {
          /* ignore */
        }
      } catch (error) {
        console.error('Failed to fetch conversation:', error);
      }
    };

    fetchDetails();

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation, removeNotificationByReference]);

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) return;
    initialLoadDoneRef.current = false;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await messageService.getByConversation(conversationId, 0, PAGE_SIZE);
        // API returns newest first — store as-is (newest at index 0)
        setMessages(conversationId, res.result);
        setPage(conversationId, 0);
        setHasMore(conversationId, res.result.length >= PAGE_SIZE);
        initialLoadDoneRef.current = true;

        // Mark unread messages from others as seen
        for (const m of res.result) {
          if (m.senderId !== user?.id && m.status !== 'READ') {
            sendSeenRef.current(m.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [conversationId, setMessages, setLoadingMessages, setPage, setHasMore, user?.id]);

  // Fetch pinned messages
  useEffect(() => {
    if (!conversationId) return;
    messageService
      .getPinnedMessages(conversationId)
      .then((res) => {
        setPinnedMessages(res.result ?? []);
        setCurrentPinnedIdx(0);
      })
      .catch(() => {});
  }, [conversationId]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!conversationId || !canLoadMore || loadingMessages || !initialLoadDoneRef.current) return;

    const nextPage = currentPage + 1;
    setLoadingMessages(true);
    try {
      const res = await messageService.getByConversation(conversationId, nextPage, PAGE_SIZE);
      // API returns newest-first per page; appendOlderMessages puts them at the end
      appendOlderMessages(conversationId, res.result);
      setPage(conversationId, nextPage);
      setHasMore(conversationId, res.result.length >= PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [
    conversationId,
    canLoadMore,
    loadingMessages,
    currentPage,
    appendOlderMessages,
    setPage,
    setHasMore,
    setLoadingMessages,
  ]);

  // Build message lookup map for reply previews
  const messageById = useMemo(() => {
    const map: Record<string, Message> = {};
    messages.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [messages]);

  // Participant display names + usernames for mention rendering
  const participantNames = useMemo(() => {
    return Object.values(participantMap).flatMap((u) =>
      [u.displayName, u.username].filter(Boolean)
    );
  }, [participantMap]);

  // Send message (try WebSocket, fallback to REST)
  const handleSend = useCallback(
    async (
      text: string,
      attachments?: Attachment[],
      messageType?: string,
      priority?: 'IMPORTANT' | 'URGENT',
      poll?: Poll,
      location?: LocationPayload
    ) => {
      if (!conversationId || !user) return;
      const replyToId = replyingTo?.id ?? null;
      const hasAttachments = attachments && attachments.length > 0;
      const msgType =
        messageType ??
        (hasAttachments
          ? attachments[0].type?.startsWith('image/')
            ? 'IMAGE'
            : attachments[0].type?.startsWith('video/')
              ? 'VIDEO'
              : attachments[0].type?.startsWith('audio/')
                ? 'AUDIO'
                : 'FILE'
          : 'TEXT');

      const optimisticLastMsg = {
        senderId: user.id,
        content: text || (hasAttachments ? `[${msgType}]` : ''),
        type: msgType as 'TEXT',
        timestamp: new Date().toISOString(),
      };

      // Try WebSocket first
      const sent = wsSendMessage(
        text,
        replyToId,
        attachments,
        messageType,
        priority,
        location,
        poll
      );
      if (sent) {
        updateConversation(conversationId, { lastMessage: optimisticLastMsg });
        setReplyingTo(null);
        scrollToLatestMessage(true);
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
          poll,
          location,
        });
        shouldScrollToLatestRef.current = true;
        addMessage(conversationId, res.result);
        updateConversation(conversationId, {
          lastMessage: {
            senderId: res.result.senderId,
            content: res.result.content,
            type: res.result.type,
            timestamp: res.result.createdAt,
          },
        });
        setReplyingTo(null);
      } catch {
        Alert.alert(t('errors.request_failed'), t('mobile.chat.send_message_failed'));
      }
    },
    [
      conversationId,
      user,
      replyingTo,
      wsSendMessage,
      addMessage,
      updateConversation,
      scrollToLatestMessage,
    ]
  );

  // Message actions
  const handleLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    setActionsVisible(true);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!selectedMessage) return;
    // Clipboard copy - no external dependency needed
    Alert.alert(t('common.copied'), selectedMessage.content);
  }, [selectedMessage]);

  const handleAskAi = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    setActionsVisible(false);
    try {
      const res = await agentService.createSession({
        title: conversation?.name ?? undefined,
        context_conversation_id: conversationId,
      });
      const sessionId = res.id;
      if (!sessionId) return;
      const encoded = encodeURIComponent(selectedMessage.content);
      const token = `ai-${Date.now()}`;
      router.push(`/assistant/${sessionId}?prefill=${encoded}&prefill_token=${token}`);
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.ai_session_failed'));
    }
  }, [selectedMessage, conversationId, conversation?.name, router, t]);

  const handleAskAiFromHeader = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await agentService.createSession({
        title: conversation?.name ?? undefined,
        context_conversation_id: conversationId,
      });
      const sessionId = res.id;
      if (!sessionId) return;
      router.push(`/assistant/${sessionId}`);
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.ai_session_failed'));
    }
  }, [conversationId, conversation?.name, router, t]);

  const handleEdit = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    const initialIsRich = isRichTextHtml(selectedMessage.content);
    setEditMode(initialIsRich ? 'editor' : 'plain');
    setEditRichDraft(initialIsRich ? selectedMessage.content : '');
    setEditPlainDraft(
      initialIsRich ? richTextToPlainText(selectedMessage.content) : selectedMessage.content
    );
    setEditModalVisible(true);
  }, [selectedMessage, conversationId]);

  const handleConfirmEdit = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    const nextContent = editMode === 'editor' ? editRichDraft.trim() : editPlainDraft.trim();
    if (!nextContent) {
      setEditModalVisible(false);
      return;
    }
    try {
      const res = await messageService.edit(selectedMessage.id, nextContent);
      updateMessage(conversationId, selectedMessage.id, res.result);
      setEditModalVisible(false);
      setEditPlainDraft('');
      setEditRichDraft('');
    } catch (error: unknown) {
      const msg =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            t('mobile.chat.edit_failed'))
          : t('mobile.chat.edit_failed');
      Alert.alert(t('errors.request_failed'), msg);
    }
  }, [selectedMessage, conversationId, editMode, editRichDraft, editPlainDraft, updateMessage, t]);

  const handleRecall = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    Alert.alert(t('mobile.chat.recall_title'), t('mobile.chat.recall_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chat.recall'),
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await messageService.recall(selectedMessage.id);
            updateMessage(conversationId, selectedMessage.id, res.result);
          } catch (error: unknown) {
            Alert.alert(
              t('errors.request_failed'),
              getApiErrorMessage(error, t('mobile.chat.recall_failed'))
            );
          }
        },
      },
    ]);
  }, [selectedMessage, conversationId, updateMessage, t]);

  const handleDelete = useCallback(async () => {
    if (!selectedMessage || !conversationId) return;
    Alert.alert(t('mobile.chat.delete_message_title'), t('mobile.chat.delete_message_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await messageService.delete(selectedMessage.id);
            removeMessage(conversationId, selectedMessage.id);
          } catch (error: unknown) {
            Alert.alert(
              t('errors.request_failed'),
              getApiErrorMessage(error, t('mobile.chat.delete_failed'))
            );
          }
        },
      },
    ]);
  }, [selectedMessage, conversationId, removeMessage, t]);

  const handleForward = useCallback(
    async (targetConversationIds: string[]) => {
      if (!selectedMessage) return;

      try {
        await messageService.forward(selectedMessage.id, targetConversationIds);
        setForwardVisible(false);
        setSelectedMessage(null);
      } catch (error: unknown) {
        Alert.alert(
          t('errors.request_failed'),
          getApiErrorMessage(error, t('mobile.chat.forward_failed'))
        );
        throw error;
      }
    },
    [selectedMessage, t]
  );

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!conversationId || !user) return;
      try {
        const res = await messageService.react(messageId, emoji);
        updateMessage(conversationId, messageId, res.result);
      } catch {
        Alert.alert(t('errors.request_failed'), t('mobile.chat.react_failed'));
      }
    },
    [conversationId, user, updateMessage]
  );

  const handleVotePoll = useCallback(
    async (messageId: string, optionIndex: number) => {
      if (!conversationId || !user) return;
      try {
        const res = await messageService.votePoll(messageId, optionIndex);
        updateMessage(conversationId, messageId, res.result);
      } catch {
        Alert.alert(t('errors.request_failed'), t('mobile.chat.vote_failed'));
      }
    },
    [conversationId, user, updateMessage]
  );

  const handleClosePoll = useCallback(
    async (messageId: string) => {
      if (!conversationId || !user) return;
      try {
        const res = await messageService.closePoll(messageId);
        updateMessage(conversationId, messageId, res.result);
      } catch {
        Alert.alert(t('errors.request_failed'), t('mobile.chat.close_poll_failed'));
      }
    },
    [conversationId, user, updateMessage]
  );

  const handleTogglePin = useCallback(
    async (messageId: string) => {
      if (!conversationId || !user) return;
      try {
        const res = await messageService.togglePin(messageId);
        updateMessage(conversationId, messageId, res.result);
        // Sync pinned messages list
        const updated = res.result;
        setPinnedMessages((prev) => {
          if (updated.pinned) {
            return prev.some((m) => m.id === updated.id) ? prev : [...prev, updated];
          }
          return prev.filter((m) => m.id !== updated.id);
        });
      } catch {
        Alert.alert(t('errors.request_failed'), t('mobile.chat.pin_failed'));
      }
    },
    [conversationId, user, updateMessage]
  );

  const handleCallAgain = useCallback(
    (calleeId: string, calleeName: string, calleeAvatar?: string) => {
      initiateCall(calleeId, conversationId ?? '', 'VOICE', calleeName, calleeAvatar);
    },
    [conversationId, initiateCall]
  );

  const handleJoinGroupCall = useCallback(
    (callId: string) => {
      if (!conversationId || !conversation) return;

      const realtimeState = useCallStore.getState().groupCallRealtimeState[callId];
      if (realtimeState?.ended) {
        Alert.alert(t('mobile.chat.call_ended_title'), t('mobile.chat.call_ended_body'));
        return;
      }

      if (endedGroupCallIds.has(callId)) {
        Alert.alert(t('mobile.chat.call_ended_title'), t('mobile.chat.call_ended_body'));
        return;
      }

      const activeCallMessage = messages.find((message) => {
        if (message.type !== 'CALL') return false;
        const payload = parseCallMessagePayload(message.content);
        if (!payload || payload.callId !== callId) return false;

        const status = (payload.status ?? '').toUpperCase();
        return status === 'RINGING' || status === 'ONGOING';
      });

      const fallbackCallMessage =
        activeCallMessage ??
        messages.find((message) => {
          if (message.type !== 'CALL') return false;
          const payload = parseCallMessagePayload(message.content);
          return payload?.callId === callId;
        });

      let callType: 'VOICE' | 'VIDEO' = 'VOICE';
      let initiatorId = '';
      let mediaProvider: CallMediaProvider = 'AGORA';

      if (fallbackCallMessage) {
        const payload = parseCallMessagePayload(fallbackCallMessage.content);
        callType = payload?.callType === 'VIDEO' ? 'VIDEO' : 'VOICE';
        mediaProvider = payload?.mediaProvider ?? 'AGORA';
        initiatorId = fallbackCallMessage.senderId;
      }

      const initiator = initiatorId ? participantMap[initiatorId] : null;

      useCallStore.getState().setIncomingGroupCall({
        callId,
        conversationId,
        initiatorId,
        initiatorName: initiator?.displayName ?? t('mobile.chat.unknown_fallback'),
        initiatorAvatar: initiator?.avatarUrl ?? null,
        groupName: conversation.name ?? t('chat.group_chat_short'),
        groupAvatarUrl: conversation.avatarUrl ?? null,
        type: callType,
        mediaProvider,
        participantCount: 0,
      });

      useCallStore.getState().setCallStatus('RINGING');
      joinGroupCall(true);
    },
    [messages, endedGroupCallIds, participantMap, conversationId, conversation, joinGroupCall]
  );

  const handleMentionPress = useCallback(
    (displayName: string) => {
      // Find user by displayName in participantMap
      const foundUser = Object.values(participantMap).find((u) => u.displayName === displayName);
      if (foundUser) {
        setMentionModalUser(foundUser);
        setShowMentionModal(true);
      }
    },
    [participantMap]
  );

  const handleAddFriend = useCallback(
    async (contactId: string) => {
      try {
        await contactService.sendRequest({ contactId });
        // Refresh contacts
        const res = await contactService.getAll();
        setContacts(res.result ?? []);
        Alert.alert(t('mobile.common.success'), t('contact.request_sent'));
      } catch {
        Alert.alert(t('errors.request_failed'), t('contact.add_friend_dialog.request_failed'));
      }
    },
    [t]
  );

  const getMentionFriendStatus = useCallback(
    (userId: string) => {
      if (userId === user?.id) return 'SELF';
      const contact = contacts.find((c) => c.contact.id === userId || c.user.id === userId);
      return contact?.status ?? null;
    },
    [contacts, user?.id]
  );

  // VCard: get friend status for a user (returns ACCEPTED, PENDING, or null)
  const getVcardFriendStatus = useCallback(
    (userId: string): 'ACCEPTED' | 'PENDING' | null => {
      if (userId === user?.id) return 'ACCEPTED'; // self
      const contact = contacts.find((c) => c.contact.id === userId || c.user.id === userId);
      if (contact?.status === 'ACCEPTED') return 'ACCEPTED';
      if (contact?.status === 'PENDING') return 'PENDING';
      return null;
    },
    [contacts, user?.id]
  );

  // VCard: open profile modal for a user
  const handleVCardPress = useCallback(
    (userId: string) => {
      // Try participantMap first, then userDirectory
      const foundUser = participantMap[userId] ?? userDirectory[userId];
      if (foundUser) {
        setMentionModalUser(foundUser);
        setShowMentionModal(true);
      }
    },
    [participantMap, userDirectory]
  );

  const activePolls = useMemo(() => {
    const now = new Date();
    return messages.filter((m) => {
      if (m.type !== 'POLL' || !m.poll) return false;
      if (m.poll.closed) return false;
      if (m.poll.deadline && new Date(m.poll.deadline) < now) return false;
      return true;
    });
  }, [messages]);

  const displayData = useMemo(() => {
    const items: ({ type: 'date'; label: string } | { type: 'message'; data: Message })[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      items.push({ type: 'message', data: msg });

      const nextMsg = messages[i + 1];
      if (nextMsg) {
        const dateLabel = formatDateSeparator(msg.createdAt);
        const nextDateLabel = formatDateSeparator(nextMsg.createdAt);
        if (nextDateLabel !== dateLabel) {
          items.push({ type: 'date', label: nextDateLabel });
        }
      }
    }

    return items;
  }, [messages]);

  const handleNavigateToMessage = useCallback(
    (messageId: string) => {
      setHighlightedMessageId(messageId);
      const idx = displayData.findIndex(
        (item) => item.type === 'message' && item.data.id === messageId
      );
      if (idx >= 0) {
        flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      }
      setTimeout(() => setHighlightedMessageId(null), 2000);
    },
    [displayData]
  );

  const handleBack = useCallback(() => {
    if (returnTo === 'contacts') {
      router.replace('/(tabs)/contacts');
      return;
    }
    if (returnTo === 'assistant') {
      router.replace('/(tabs)/assistant');
      return;
    }
    if (returnTo === 'notifications') {
      router.replace('/(tabs)/chats');
      return;
    }
    if (returnTo === 'chats') {
      router.replace('/(tabs)/chats');
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/chats');
  }, [returnTo, router]);

  // Resolve chat header info
  const isGroup = conversation?.type === 'GROUP';
  let chatName = conversation?.name ?? t('mobile.chat.conversation_fallback');
  let chatAvatar = conversation?.avatarUrl;

  if (!isGroup && conversation) {
    const otherId = conversation.participantIds.find((id) => id !== user?.id);
    if (otherId && participantMap[otherId]) {
      chatName = participantMap[otherId].displayName;
      chatAvatar = participantMap[otherId].avatarUrl;
    }
  }

  const inputBottomInset =
    Platform.OS === 'android' && androidKeyboardInset > 0 ? androidKeyboardInset : insets.bottom;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
      style={{ backgroundColor: Colors.bg }}>
      {/* Header */}
      <ChatHeader
        name={chatName}
        avatarUrl={chatAvatar}
        isGroup={isGroup}
        memberCount={conversation?.participantIds.length}
        isOnline={!isGroup && otherUserOnline}
        conversationId={conversationId}
        receiverId={otherUserId ?? undefined}
        onBack={handleBack}
        onToggleSearch={() => {
          setShowSearch((prev) => !prev);
          if (showSearch) {
            setHighlightedMessageId(null);
            setHighlightKeyword('');
          }
        }}
        onPressInfo={() => {
          router.push(`/chat/${conversationId}/info`);
        }}
        onAskAi={isGroup ? handleAskAiFromHeader : undefined}
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

      {/* Pinned messages banner */}
      <PinnedMessagesBanner
        pinnedMessages={pinnedMessages}
        currentIdx={currentPinnedIdx}
        onPrev={() => setCurrentPinnedIdx((i) => (i > 0 ? i - 1 : pinnedMessages.length - 1))}
        onNext={() => setCurrentPinnedIdx((i) => (i < pinnedMessages.length - 1 ? i + 1 : 0))}
        onPress={(messageId) => handleNavigateToMessage(messageId)}
        onUnpin={(messageId) => handleTogglePin(messageId)}
        onViewAll={() => setShowPinnedList(true)}
      />

      {/* Active polls banner */}
      {!isPollBannerDismissed && (
        <ActivePollBanner
          polls={activePolls}
          currentIdx={currentPollIdx}
          onPrev={() => setCurrentPollIdx((i) => (i > 0 ? i - 1 : activePolls.length - 1))}
          onNext={() => setCurrentPollIdx((i) => (i < activePolls.length - 1 ? i + 1 : 0))}
          onPress={(messageId) => handleNavigateToMessage(messageId)}
          onDismiss={() => setIsPollBannerDismissed(true)}
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
            keyExtractor={(item) =>
              item.type === 'date' ? `date-${item.label}` : `msg-${item.data.id}`
            }
            renderItem={({ item }) => {
              if (item.type === 'date') {
                return <DateSeparator label={item.label} />;
              }
              const msg = item.data;
              const isMe = msg.senderId === user?.id && msg.type !== 'AGENT';
              const isAgent = msg.type === 'AGENT';
              const sender = participantMap[msg.senderId];
              const agentSenderName =
                isAgent && sender ? `${sender.displayName} + AI` : sender?.displayName;
              const isHighlighted = highlightedMessageId === msg.id;
              return (
                <View
                  style={
                    isHighlighted
                      ? { backgroundColor: 'rgba(234,179,8,0.15)', borderRadius: 12 }
                      : undefined
                  }>
                  <MessageBubble
                    message={msg}
                    isMe={isMe}
                    showAvatar={isGroup}
                    senderName={agentSenderName}
                    senderRole={isAgent ? undefined : sender?.role}
                    senderAvatarUrl={isGroup ? sender?.avatarUrl : undefined}
                    currentUserId={user?.id}
                    onLongPress={() => handleLongPress(msg)}
                    onReact={handleReact}
                    onVotePoll={handleVotePoll}
                    onClosePoll={handleClosePoll}
                    participantMap={participantMap}
                    replyToMessage={msg.replyToId ? (messageById[msg.replyToId] ?? null) : null}
                    onCallAgain={handleCallAgain}
                    onJoinGroupCall={handleJoinGroupCall}
                    endedGroupCallIds={endedGroupCallIds}
                    isGroupConversation={isGroup}
                    calleeInfo={
                      isMe
                        ? null
                        : {
                            id: msg.senderId,
                            name: sender?.displayName ?? t('mobile.chat.user_fallback'),
                            avatar: sender?.avatarUrl,
                          }
                    }
                    highlightKeyword={highlightKeyword}
                    onMentionPress={isGroup ? handleMentionPress : undefined}
                    participantNames={isGroup ? participantNames : undefined}
                    onVCardPress={handleVCardPress}
                    onAddFriend={handleAddFriend}
                    vcardFriendStatus={getVcardFriendStatus}
                    onScrollToMessage={handleNavigateToMessage}
                    onSwipeReply={(m) => setReplyingTo(m)}
                  />
                </View>
              );
            }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            onContentSizeChange={handleMessagesContentSizeChange}
            inverted
            // Prevent scroll position from jumping when older messages are appended
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            ListFooterComponent={
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

      {/* Input — blocked banner or ChatInput */}
      <View style={{ paddingBottom: inputBottomInset }}>
        {!isGroup && blockDirection ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: Colors.bgCard,
              borderTopWidth: 0.5,
              borderTopColor: Colors.borderLight,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
            <Ionicons
              name={blockDirection === 'I_BLOCKED' ? 'ban-outline' : 'shield-outline'}
              size={18}
              color={Colors.textMuted}
            />
            <Text style={{ flex: 1, fontSize: 14, color: Colors.textMuted }}>
              {blockDirection === 'I_BLOCKED'
                ? t('chat.user_blocked_by_me')
                : t('chat.user_blocked_by_them')}
            </Text>
            {blockDirection === 'I_BLOCKED' && (
              <TouchableOpacity
                onPress={() => {
                  if (!otherUserId || !user) return;
                  Alert.alert(t('chat.unblock_user_q'), t('mobile.chat.unblock_short_desc'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('contact.unblock'),
                      onPress: async () => {
                        try {
                          await contactService.unblockByUser(otherUserId);
                          invalidateContacts();
                          setBlockDirection(null);
                        } catch (error: unknown) {
                          Alert.alert(
                            t('errors.request_failed'),
                            getApiErrorMessage(error, t('mobile.chat.unblock_failed'))
                          );
                        }
                      },
                    },
                  ]);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: Colors.ctaLight,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.cta }}>
                  {t('contact.unblock')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ChatInput
            conversationId={conversationId}
            onSend={handleSend}
            onTyping={sendTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            prefilledText={decodedPrefillText}
            prefilledToken={activePrefillToken}
            onPrefillApplied={() => setActivePrefillToken(undefined)}
            isGroup={isGroup}
            showAiMention={isGroup && !!conversation?.aiProactiveEnabled}
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
        )}
      </View>

      {/* Message Actions Bottom Sheet */}
      <MessageActions
        visible={actionsVisible}
        message={selectedMessage}
        isMe={selectedMessage?.senderId === user?.id && selectedMessage?.type !== 'AGENT'}
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
        onReact={
          selectedMessage ? (emoji: string) => handleReact(selectedMessage.id, emoji) : undefined
        }
        onEdit={handleEdit}
        onRecall={handleRecall}
        onDelete={handleDelete}
        onTogglePin={
          selectedMessage
            ? () => {
                handleTogglePin(selectedMessage.id);
                setActionsVisible(false);
              }
            : undefined
        }
        onAskAi={isGroup ? handleAskAi : undefined}
      />

      <ForwardMessageModal
        visible={forwardVisible}
        currentConversationId={conversationId ?? ''}
        currentUserId={user?.id ?? ''}
        onClose={() => setForwardVisible(false)}
        onConfirm={handleForward}
      />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}
          onPress={() => setEditModalVisible(false)}>
          <Pressable
            style={{
              backgroundColor: Colors.bgCard,
              borderRadius: 16,
              padding: 14,
              maxHeight: '75%',
            }}
            onPress={() => {}}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 10 }}>
              {t('mobile.chat.edit_message_title')}
            </Text>

            <TextRichComposer
              mode={editMode}
              onModeChange={setEditMode}
              plainText={editPlainDraft}
              onPlainTextChange={setEditPlainDraft}
              richHtml={editRichDraft}
              onRichHtmlChange={setEditRichDraft}
              placeholder={t('mobile.chat.edit_message_placeholder')}
              minHeight={120}
              showToolbar={editMode === 'editor'}
              editorKey={selectedMessage?.id ?? 'edit-message'}
            />

            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: Colors.bg,
                }}>
                <Text style={{ color: Colors.textMuted, fontWeight: '600' }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmEdit}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: Colors.cta,
                }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Pinned messages list modal */}
      <Modal
        visible={showPinnedList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinnedList(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setShowPinnedList(false)}>
          <Pressable
            style={{
              backgroundColor: Colors.bgCard,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '70%',
            }}
            onPress={() => {}}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Ionicons name="pin" size={16} color="#F59E0B" />
              <Text
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 15,
                  fontWeight: '700',
                  color: Colors.text,
                }}>
                Pinned Messages ({pinnedMessages.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowPinnedList(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {/* List */}
            <FlatList
              data={pinnedMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item: msg }) => {
                const sender = participantMap[msg.senderId];
                const senderName = sender?.displayName ?? t('mobile.chat.unknown_fallback');
                const msgPreview =
                  msg.content ||
                  (msg.type === 'POLL'
                    ? `Poll: ${msg.poll?.question}`
                    : `[${msg.type?.toLowerCase()}]`);
                return (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowPinnedList(false);
                      handleNavigateToMessage(msg.id);
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 12, fontWeight: '600', color: Colors.cta }}
                        numberOfLines={1}>
                        {senderName}
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: Colors.text, marginTop: 2 }}
                        numberOfLines={2}>
                        {msgPreview}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        handleTogglePin(msg.id);
                        if (pinnedMessages.length <= 1) setShowPinnedList(false);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 12 }}>
                      <Ionicons name="pin-outline" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => (
                <View
                  style={{ height: 0.5, backgroundColor: Colors.borderLight, marginHorizontal: 16 }}
                />
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mention user info modal */}
      <Modal
        visible={showMentionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMentionModal(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowMentionModal(false)}>
          <Pressable
            style={{
              backgroundColor: Colors.bgCard,
              borderRadius: 20,
              width: 280,
              overflow: 'hidden',
            }}
            onPress={() => {}}>
            {mentionModalUser &&
              (() => {
                const friendStatus = getMentionFriendStatus(mentionModalUser.id);
                return (
                  <>
                    {/* Avatar & info */}
                    <View
                      style={{
                        alignItems: 'center',
                        paddingTop: 24,
                        paddingBottom: 16,
                        paddingHorizontal: 20,
                      }}>
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: Colors.cta,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          marginBottom: 12,
                        }}>
                        {mentionModalUser.avatarUrl ? (
                          <Image
                            source={{ uri: mentionModalUser.avatarUrl }}
                            style={{ width: 64, height: 64, borderRadius: 32 }}
                          />
                        ) : (
                          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                            {mentionModalUser.displayName.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: Colors.text,
                          textAlign: 'center',
                        }}>
                        {mentionModalUser.displayName}
                      </Text>
                      {mentionModalUser.username ? (
                        <Text style={{ fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>
                          @{mentionModalUser.username}
                        </Text>
                      ) : null}
                    </View>

                    {/* Friend status action */}
                    <View
                      style={{
                        borderTopWidth: 0.5,
                        borderTopColor: Colors.borderLight,
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                      }}>
                      {friendStatus === 'SELF' ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 6,
                          }}>
                          <Ionicons name="person" size={16} color={Colors.textMuted} />
                          <Text style={{ fontSize: 13, color: Colors.textMuted, marginLeft: 6 }}>
                            This is you
                          </Text>
                        </View>
                      ) : friendStatus === 'ACCEPTED' ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 6,
                          }}>
                          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                          <Text
                            style={{
                              fontSize: 13,
                              color: '#16a34a',
                              fontWeight: '600',
                              marginLeft: 6,
                            }}>
                            Friends
                          </Text>
                        </View>
                      ) : friendStatus === 'PENDING' ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 6,
                          }}>
                          <Ionicons name="time-outline" size={16} color="#d97706" />
                          <Text
                            style={{
                              fontSize: 13,
                              color: '#d97706',
                              fontWeight: '600',
                              marginLeft: 6,
                            }}>
                            Request sent
                          </Text>
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
                          }}>
                          <Ionicons name="person-add" size={16} color="#fff" />
                          <Text
                            style={{
                              fontSize: 14,
                              color: '#fff',
                              fontWeight: '600',
                              marginLeft: 6,
                            }}>
                            Add friend
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Close button */}
                    <TouchableOpacity
                      onPress={() => setShowMentionModal(false)}
                      style={{
                        borderTopWidth: 0.5,
                        borderTopColor: Colors.borderLight,
                        paddingVertical: 12,
                        alignItems: 'center',
                      }}>
                      <Text style={{ fontSize: 14, color: Colors.textMuted }}>Close</Text>
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

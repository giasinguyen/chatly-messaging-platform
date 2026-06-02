import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConversationItem } from '@/components/chat/ConversationItem';
import { CreateConversationModal } from '@/components/chat/CreateConversationModal';
import { conversationService } from '@/services/conversation.service';
import { userService } from '@/services/user.service';
import { useConversationStore } from '@/store/conversation.store';
import { useAuthStore } from '@/store/auth.store';
import { usePresenceSocket } from '@/hooks/usePresenceSocket';
import { Colors } from '@/constants/theme';
import { isConvMuted, useConversationPrefsStore } from '@/store/conversationPrefs.store';
import { useThemeStore } from '@/store/theme.store';
import { getApiErrorMessage } from '@/utils/errorHandler';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';

export default function ChatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  useThemeStore((state) => state.isDarkMode);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { conversations, fetchConversations, removeConversation, loading } = useConversationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [participantMap, setParticipantMap] = useState<Record<string, UserResponse>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Track presence changes
  usePresenceSocket({
    onPresenceChange: (event) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (event.status === 'ONLINE') {
          next.add(event.userId);
        } else {
          next.delete(event.userId);
        }
        return next;
      });
    },
  });

  const loadParticipants = useCallback(async () => {
    try {
      const usersRes = await userService.getAll();
      const map: Record<string, UserResponse> = {};
      const online = new Set<string>();
      usersRes.result.forEach((u) => {
        map[u.id] = u;
        if (u.status === 'ONLINE') online.add(u.id);
      });
      setParticipantMap(map);
      setOnlineUserIds(online);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    loadParticipants();
  }, [fetchConversations, loadParticipants]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchConversations(), loadParticipants()]);
    setRefreshing(false);
  }, [fetchConversations, loadParticipants]);

  const { prefs, hydrate } = useConversationPrefsStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Filter conversations by search query, then sort pinned first
  const filtered = (() => {
    const list = searchQuery.trim()
      ? conversations.filter((c) => {
          const q = searchQuery.toLowerCase();
          if (c.name?.toLowerCase().includes(q)) return true;
          return c.participantIds.some((id) =>
            participantMap[id]?.displayName?.toLowerCase().includes(q)
          );
        })
      : conversations;
    return [...list].sort((a, b) => {
      const aPinned = prefs[a.id]?.isPinned ? 1 : 0;
      const bPinned = prefs[b.id]?.isPinned ? 1 : 0;
      return bPinned - aPinned;
    });
  })();

  const participantNames: Record<string, string> = {};
  const participantAvatars: Record<string, string | undefined> = {};
  Object.values(participantMap).forEach((u) => {
    participantNames[u.id] = u.displayName;
    participantAvatars[u.id] = u.avatarUrl;
  });

  const handleConversationPress = (conversation: ConversationResponse) => {
    router.push({ pathname: '/chat/[id]', params: { id: conversation.id, returnTo: 'chats' } });
  };

  const handleDeleteConversation = useCallback(
    (conversation: ConversationResponse) => {
      const name =
        conversation.type === 'PRIVATE'
          ? (participantMap[conversation.participantIds.find((id) => id !== user?.id) ?? '']
              ?.displayName ?? t('common.you'))
          : (conversation.name ?? t('chat.create_group'));
      Alert.alert(
        t('mobile.chat.delete_conversation_title'),
        t('mobile.chat.delete_conversation_body', { name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await conversationService.delete(conversation.id);
                removeConversation(conversation.id);
              } catch (error: unknown) {
                const msg = getApiErrorMessage(error, t('chat.delete_conv_failed'));
                Alert.alert(t('errors.request_failed'), msg);
              }
            },
          },
        ],
      );
    },
    [participantMap, removeConversation, t, user?.id],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-2xl font-bold" style={{ color: Colors.text }}>
            {t('nav.messages')}
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => setIsModalVisible(true)} className="mr-1 p-2">
              <Ionicons name="add-circle-outline" size={26} color={Colors.cta} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => fetchConversations()} className="p-2">
              <Ionicons name="refresh" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar - moved inside header container */}
        <View className="px-4 pb-2">
          <View
            className="flex-row items-center rounded-xl px-3"
            style={{
              backgroundColor: Colors.bg,
              height: 38,
            }}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              className="ml-2 flex-1 text-sm"
              placeholder={t('chat.search_placeholder')}
              placeholderTextColor={Colors.textLight}
              style={{ color: Colors.text }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Conversation List */}
      {loading && conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              currentUserId={user?.id ?? ''}
              participantNames={participantNames}
              participantAvatars={participantAvatars}
              onlineUserIds={onlineUserIds}
              isPinned={prefs[item.id]?.isPinned ?? false}
              isMuted={isConvMuted(prefs[item.id] ?? {})}
              onPress={() => handleConversationPress(item)}
              onLongPress={() => handleDeleteConversation(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.cta}
              colors={[Colors.cta]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.borderLight} />
              <Text className="mt-4 text-base" style={{ color: Colors.textMuted }}>
                {searchQuery
                  ? t('mobile.chat.no_conversations_found')
                  : t('chat.no_messages_yet')}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: Colors.textLight }}>
                {searchQuery
                  ? t('mobile.chat.search_no_results_hint')
                  : t('mobile.chat.start_conversation_hint')}
              </Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CreateConversationModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} />
    </View>
  );
}

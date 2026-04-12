import { useEffect, useState, useCallback } from 'react';
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
import { Colors } from '@/constants/theme';
import { useNotificationStore } from '@/store/notification.store';
import { useConversationPrefsStore } from '@/store/conversationPrefs.store';
import { isConvMuted } from '@/store/conversationPrefs.store';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { conversations, fetchConversations, removeConversation, loading } = useConversationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [participantMap, setParticipantMap] = useState<Record<string, UserResponse>>({});

  const loadData = useCallback(async () => {
    try {
      await fetchConversations();

      // Collect unique participant IDs to fetch their names (using the updated conversations from store)
      // Note: We need to access the store's latest state or wait for fetchConversations to finish.
      // Since fetchConversations is async and updates the store, we might need a small delay or refetch logic.
      // Better: Fetch users once on mount.
    } catch (error) {
      console.error('Failed to load chats data:', error);
    }
  }, [fetchConversations]);

  const loadParticipants = useCallback(async () => {
    try {
      const usersRes = await userService.getAll();
      const map: Record<string, UserResponse> = {};
      usersRes.result.forEach((u) => {
        map[u.id] = u;
      });
      setParticipantMap(map);
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

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { prefs, hydrate } = useConversationPrefsStore();

  useEffect(() => { hydrate(); }, []);

  // Filter conversations by search query, then sort pinned first
  const filtered = (() => {
    const list = searchQuery.trim()
      ? conversations.filter((c) => {
          const q = searchQuery.toLowerCase();
          if (c.name?.toLowerCase().includes(q)) return true;
          return c.participantIds.some((id) =>
            participantMap[id]?.displayName?.toLowerCase().includes(q),
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
    router.push(`/chat/${conversation.id}`);
  };

  const handleDeleteConversation = useCallback((conversation: ConversationResponse) => {
    const name = conversation.type === 'PRIVATE'
      ? (participantMap[conversation.participantIds.find((id) => id !== user?.id) ?? '']?.displayName ?? 'this conversation')
      : (conversation.name ?? 'this group');
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationService.delete(conversation.id);
              removeConversation(conversation.id);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message ?? 'Could not delete conversation.');
            }
          },
        },
      ],
    );
  }, [participantMap, removeConversation, user?.id]);

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: Colors.white,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-2xl font-bold" style={{ color: Colors.text }}>
            Messages
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.push('/notifications')}
              className="mr-2 p-2 relative"
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.text} />
              {unreadCount > 0 && (
                <View 
                  className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: Colors.error }}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsModalVisible(true)} className="p-2 mr-1">
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
            }}
          >
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              className="ml-2 flex-1 text-sm"
              placeholder="Search conversations..."
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
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: Colors.textLight }}>
                {searchQuery
                  ? 'Try another keyword'
                  : 'Start a new conversation!'}
              </Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CreateConversationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

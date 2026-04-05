import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConversationItem } from '@/components/chat/ConversationItem';
import { conversationService } from '@/services/conversation.service';
import { userService } from '@/services/user.service';
import { useConversationStore } from '@/store/conversation.store';
import { useAuthStore } from '@/store/auth.store';
import { Colors } from '@/constants/theme';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { conversations, setConversations, loading, setLoading } = useConversationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [participantMap, setParticipantMap] = useState<Record<string, UserResponse>>({});

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await conversationService.getMyConversations();
      setConversations(res.result);

      // Collect unique participant IDs to fetch their names
      const allIds = new Set<string>();
      res.result.forEach((c) => c.participantIds.forEach((id) => allIds.add(id)));
      // Remove current user
      if (user?.id) allIds.delete(user.id);

      // Fetch participant details (batch)
      const usersRes = await userService.getAll();
      const map: Record<string, UserResponse> = {};
      usersRes.result.forEach((u) => {
        if (allIds.has(u.id)) map[u.id] = u;
      });
      setParticipantMap(map);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [setConversations, setLoading, user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  // Filter conversations by search query
  const filtered = searchQuery.trim()
    ? conversations.filter((c) => {
        const q = searchQuery.toLowerCase();
        if (c.name?.toLowerCase().includes(q)) return true;
        // Search by participant names
        return c.participantIds.some((id) =>
          participantMap[id]?.displayName?.toLowerCase().includes(q),
        );
      })
    : conversations;

  const participantNames: Record<string, string> = {};
  const participantAvatars: Record<string, string | undefined> = {};
  Object.values(participantMap).forEach((u) => {
    participantNames[u.id] = u.displayName;
    participantAvatars[u.id] = u.avatarUrl;
  });

  const handleConversationPress = (conversation: ConversationResponse) => {
    router.push(`/chat/${conversation.id}`);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
          backgroundColor: Colors.white,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: Colors.text }}>
            Tin nhắn
          </Text>
          <TouchableOpacity
            onPress={() => {
              // TODO: New conversation modal
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.ctaLight,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="create-outline" size={20} color={Colors.cta} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          className="flex-row items-center rounded-xl px-3"
          style={{
            backgroundColor: Colors.bg,
            height: 38,
            marginBottom: 4,
          }}
        >
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            className="ml-2 flex-1 text-sm"
            placeholder="Tìm kiếm cuộc trò chuyện..."
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
              onPress={() => handleConversationPress(item)}
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
                {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có tin nhắn nào'}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: Colors.textLight }}>
                {searchQuery
                  ? 'Thử từ khóa khác'
                  : 'Bắt đầu cuộc trò chuyện mới!'}
              </Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

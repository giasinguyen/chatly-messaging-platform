import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { conversationService } from '@/services/conversation.service';
import { userService } from '@/services/user.service';
import type { ConversationResponse } from '@/types/conversation';
import type { UserResponse } from '@/types/auth';

interface ForwardMessageModalProps {
  visible: boolean;
  currentConversationId: string;
  currentUserId: string;
  onClose: () => void;
  onConfirm: (conversationIds: string[]) => Promise<void>;
}

export function ForwardMessageModal({
  visible,
  currentConversationId,
  currentUserId,
  onClose,
  onConfirm,
}: ForwardMessageModalProps) {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [users, setUsers] = useState<Record<string, UserResponse>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedIds([]);
      setSearchQuery('');
      return;
    }

    let disposed = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [conversationRes, usersRes] = await Promise.all([
          conversationService.getMyConversations(),
          userService.getAll(),
        ]);

        if (disposed) return;

        setConversations(
          (conversationRes.result ?? []).filter((conversation) => conversation.id !== currentConversationId),
        );
        setUsers(
          Object.fromEntries((usersRes.result ?? []).map((user) => [user.id, user])),
        );
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    fetchData();
    return () => {
      disposed = true;
    };
  }, [visible, currentConversationId]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return conversations;

    return conversations.filter((conversation) => {
      const displayName = getConversationDisplayName(conversation, currentUserId, users).toLowerCase();
      return displayName.includes(normalizedQuery);
    });
  }, [conversations, currentUserId, searchQuery, users]);

  const toggleConversation = (conversationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId],
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;

    try {
      setSubmitting(true);
      await onConfirm(selectedIds);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: Colors.overlay }}
        onPress={onClose}
      >
        <Pressable
          className="rounded-t-3xl px-5 pb-8 pt-4"
          style={{ backgroundColor: Colors.bgCard, minHeight: '70%' }}
          onPress={(event) => event.stopPropagation()}
        >
          <View
            className="mb-4 self-center rounded-full"
            style={{ width: 36, height: 4, backgroundColor: Colors.borderLight }}
          />

          <Text className="text-xl font-bold" style={{ color: Colors.text }}>
            Forward Message
          </Text>
          <Text className="mt-1 text-sm" style={{ color: Colors.textMuted }}>
            Select one or more conversations to forward.
          </Text>

          <View
            className="mt-4 flex-row items-center rounded-2xl px-3"
            style={{ backgroundColor: Colors.bg, height: 44 }}
          >
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              className="ml-2 flex-1 text-sm"
              placeholder="Search conversations..."
              placeholderTextColor={Colors.textLight}
              style={{ color: Colors.text }}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
            {loading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="small" color={Colors.cta} />
                <Text className="mt-3 text-sm" style={{ color: Colors.textMuted }}>
                  Loading conversations...
                </Text>
              </View>
            ) : filteredConversations.length === 0 ? (
              <View className="items-center justify-center py-10">
                <Text className="text-sm" style={{ color: Colors.textMuted }}>
                  No matching conversations found.
                </Text>
              </View>
            ) : (
              filteredConversations.map((conversation) => {
                const displayName = getConversationDisplayName(conversation, currentUserId, users);
                const avatarUri = getConversationAvatar(conversation, currentUserId, users);
                const selected = selectedIds.includes(conversation.id);

                return (
                  <TouchableOpacity
                    key={conversation.id}
                    onPress={() => toggleConversation(conversation.id)}
                    activeOpacity={0.75}
                    className="mb-2 flex-row items-center rounded-2xl px-3 py-3"
                    style={{ backgroundColor: selected ? Colors.ctaLight : Colors.bg }}
                  >
                    <View
                      className="mr-3 h-5 w-5 items-center justify-center rounded-md border"
                      style={{
                        borderColor: selected ? Colors.cta : Colors.borderLight,
                        backgroundColor: selected ? Colors.cta : Colors.white,
                      }}
                    >
                      {selected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                    </View>
                    <Avatar uri={avatarUri} name={displayName} size={42} />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold" style={{ color: Colors.text }} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text className="mt-0.5 text-xs" style={{ color: Colors.textMuted }} numberOfLines={1}>
                        {conversation.type === 'GROUP' ? 'Group chat' : 'Direct chat'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.75}
              className="flex-1 items-center justify-center rounded-2xl py-3"
              style={{ backgroundColor: Colors.bg }}
              disabled={submitting}
            >
              <Text className="font-semibold" style={{ color: Colors.text }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center rounded-2xl py-3"
              style={{
                backgroundColor: selectedIds.length > 0 && !loading ? Colors.cta : Colors.borderLight,
              }}
              disabled={selectedIds.length === 0 || submitting || loading}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="arrow-redo-outline" size={18} color={Colors.white} />
                  <Text className="ml-2 font-semibold text-white">Forward</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getConversationDisplayName(
  conversation: ConversationResponse,
  currentUserId: string,
  users: Record<string, UserResponse>,
) {
  if (conversation.type === 'PRIVATE') {
    const otherId = conversation.participantIds.find((id) => id !== currentUserId);
    if (otherId) {
      return users[otherId]?.displayName ?? 'User';
    }
  }

  return conversation.name ?? 'Group chat';
}

function getConversationAvatar(
  conversation: ConversationResponse,
  currentUserId: string,
  users: Record<string, UserResponse>,
) {
  if (conversation.type === 'PRIVATE') {
    const otherId = conversation.participantIds.find((id) => id !== currentUserId);
    if (otherId) {
      return users[otherId]?.avatarUrl;
    }
  }

  return conversation.avatarUrl ?? undefined;
}

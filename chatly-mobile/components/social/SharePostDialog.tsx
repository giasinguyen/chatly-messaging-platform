import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { Colors } from '@/constants/theme';
import { useShareTargets } from '@/hooks/useShareTargets';
import { conversationService } from '@/services/conversation.service';
import { messageService } from '@/services/message.service';
import { postService } from '@/services/post.service';
import { useAuthStore } from '@/store/auth.store';
import { useMessageStore } from '@/store/message.store';
import type { Attachment } from '@/types/message';
import type { Post } from '@/types/post';
import { PostSharePreview } from './PostSharePreview';
import { ShareTargetRow } from './ShareTargetRow';

interface SharePostDialogProps {
  post: Post;
  visible: boolean;
  onClose: () => void;
  onShared?: (updatedPost: Post) => void;
}

type ShareTargetKind = 'FRIEND' | 'GROUP';
interface ShareTarget { key: string; title: string; subtitle: string; avatarUrl?: string | null; }

function toTargetKey(kind: ShareTargetKind, id: string): string {
  return `${kind}:${id}`;
}

function buildPreviewAttachment(post: Post): Attachment {
  const previewText = post.content.trim().replace(/\s+/g, ' ');
  return {
    kind: 'POST_PREVIEW',
    type: 'application/x-chatly-post-preview',
    url: `/post/${post.id}`,
    targetUrl: `/post/${post.id}`,
    name: post.content.slice(0, 60) || i18n.t('post.share_dialog.shared_post_name'),
    postId: post.id,
    postTitle: previewText.slice(0, 80) || i18n.t('post.share_dialog.shared_post_name'),
    postExcerpt: previewText.slice(0, 180) || i18n.t('post.share_dialog.post_excerpt'),
    postImageUrl: post.mediaUrls[0],
    postAuthorName: post.authorDisplayName ?? i18n.t('post.share_dialog.unknown_author'),
    postAuthorAvatarUrl: post.authorAvatarUrl,
  };
}

export function SharePostDialog({ post, visible, onClose, onShared }: SharePostDialogProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const { friends, privateConversations, groupConversations, isLoadingTargets } = useShareTargets(
    visible,
    currentUser?.id,
  );
  const [selectedTargetKeys, setSelectedTargetKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedTargetKeys([]);
      setSearchQuery('');
    }
  }, [visible]);

  const previewAttachment = useMemo(() => buildPreviewAttachment(post), [post]);

  const targets = useMemo<ShareTarget[]>(
    () => [
      ...friends.map((friend) => ({
        key: toTargetKey('FRIEND', friend.id),
        title: friend.displayName,
        subtitle: `@${friend.username}`,
        avatarUrl: friend.avatarUrl,
      })),
      ...groupConversations.map((conversation) => ({
        key: toTargetKey('GROUP', conversation.id),
        title: conversation.name,
        subtitle: t('post.share_dialog.group_chat'),
        avatarUrl: conversation.avatarUrl,
      })),
    ],
    [friends, groupConversations, t],
  );

  const filteredTargets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return targets;
    return targets.filter(
      (target) =>
        target.title.toLowerCase().includes(query) ||
        target.subtitle.toLowerCase().includes(query),
    );
  }, [searchQuery, targets]);

  const toggleTarget = (targetKey: string) => {
    setSelectedTargetKeys((current) =>
      current.includes(targetKey)
        ? current.filter((key) => key !== targetKey)
        : [...current, targetKey],
    );
  };

  const handleShare = async () => {
    if (!currentUser?.id) {
      Alert.alert(t('common.error'), t('post.share_dialog.sign_in_required'));
      return;
    }

    if (selectedTargetKeys.length === 0) {
      Alert.alert(t('common.error'), t('post.share_dialog.select_target'));
      return;
    }

    setIsSharing(true);
    try {
      const targetFriends = friends.filter((friend) =>
        selectedTargetKeys.includes(toTargetKey('FRIEND', friend.id)),
      );
      const targetGroups = groupConversations.filter((conversation) =>
        selectedTargetKeys.includes(toTargetKey('GROUP', conversation.id)),
      );

      const friendConversationIds = await Promise.all(
        targetFriends.map(async (friend) => {
          const existingConversation = privateConversations.find(
            (conversation) =>
              conversation.participantIds.includes(friend.id) &&
              conversation.participantIds.includes(currentUser.id),
          );

          if (existingConversation) {
            return existingConversation.id;
          }

          const createdConversationResponse = await conversationService.create({
            type: 'PRIVATE',
            participantIds: [friend.id],
          });

          if (createdConversationResponse.code !== 1000 || !createdConversationResponse.result) {
            throw new Error(
              createdConversationResponse.message ?? t('post.share_dialog.open_conversation_failed'),
            );
          }

          return createdConversationResponse.result.id;
        }),
      );

      const targetConversationIds = [
        ...new Set([
          ...friendConversationIds,
          ...targetGroups.map((conversation) => conversation.id),
        ]),
      ];

      const { addMessage } = useMessageStore.getState();

      await Promise.all(
        targetConversationIds.map(async (conversationId) => {
          const response = await messageService.send({
            conversationId,
            content: '',
            attachments: [previewAttachment],
          });

          if (response.code !== 1000 || !response.result) {
            throw new Error(response.message ?? t('post.share_dialog.share_failed'));
          }

          // Add message to store immediately with attachment data from API response
          addMessage(conversationId, response.result);
        }),
      );

      const shareResponse = await postService.sharePost(post.id);
      if (shareResponse.code !== 1000 || !shareResponse.result) {
        throw new Error(shareResponse.message ?? t('post.share_dialog.share_failed'));
      }

      onShared?.(shareResponse.result);

      const summaryParts: string[] = [];
      if (targetFriends.length > 0) {
        summaryParts.push(
          t('post.share_dialog.friends_count', { count: targetFriends.length }),
        );
      }
      if (targetGroups.length > 0) {
        summaryParts.push(
          t('post.share_dialog.groups_count', { count: targetGroups.length }),
        );
      }

      Alert.alert(
        t('post.share_dialog.shared_title'),
        t('post.share_dialog.shared_with', {
          summary: summaryParts.join(` ${t('post.share_dialog.summary_and')} `),
        }),
      );
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t('post.share_dialog.share_failed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={() => !isSharing && onClose()} />

        <View className="rounded-t-[28px] bg-white px-4 pb-8 pt-3">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-gray-300" />
          </View>

          <View className="mb-4 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xl font-bold text-[#1D1D1F]">{t('post.share_dialog.title')}</Text>
              <Text className="mt-1 text-sm leading-5 text-[#6E6E73]">
                {t('post.share_dialog.subtitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSharing}
              className="rounded-full bg-gray-100 p-2"
              activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View className="mb-4"><PostSharePreview post={post} /></View>

          <View className="mb-4 flex-row items-center rounded-2xl border border-[#E5E5EA] bg-[#FAFAFB] px-3">
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('post.share_dialog.search_placeholder')}
              placeholderTextColor={Colors.textLight}
              className="ml-2 h-12 flex-1 text-sm text-[#1D1D1F]"
            />
          </View>

          {isLoadingTargets ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="small" color={Colors.cta} />
              <Text className="mt-2 text-sm text-[#6E6E73]">
                {t('post.share_dialog.loading_targets')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTargets}
              keyExtractor={(item) => item.key}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={
                <View className="items-center py-10">
                  <Text className="text-sm text-[#6E6E73]">{t('post.share_dialog.no_targets')}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedTargetKeys.includes(item.key);
                return (
                  <ShareTargetRow
                    title={item.title}
                    subtitle={item.subtitle}
                    avatarUrl={item.avatarUrl}
                    isSelected={isSelected}
                    onPress={() => toggleTarget(item.key)}
                  />
                );
              }}
            />
          )}

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              disabled={isSharing}
              className="h-12 flex-1 items-center justify-center rounded-2xl border border-[#D1D1D6] bg-white"
              activeOpacity={0.8}>
              <Text className="text-sm font-semibold text-[#1D1D1F]">{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing || selectedTargetKeys.length === 0}
              className={`h-12 flex-1 flex-row items-center justify-center rounded-2xl ${
                isSharing || selectedTargetKeys.length === 0 ? 'bg-[#C7D2FE]' : 'bg-[#0071E3]'
              }`}
              activeOpacity={0.8}>
              {isSharing ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text className="ml-2 text-sm font-semibold text-white">
                {selectedTargetKeys.length > 0
                  ? t('mobile.reels.share_with_count', { count: selectedTargetKeys.length })
                  : t('common.share')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

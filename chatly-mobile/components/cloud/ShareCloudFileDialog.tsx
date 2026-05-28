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
import { Colors } from '@/constants/theme';
import { CloudFilePreview } from '@/components/cloud/CloudFilePreview';
import { ShareTargetRow } from '@/components/social/ShareTargetRow';
import { useShareTargets } from '@/hooks/useShareTargets';
import { conversationService } from '@/services/conversation.service';
import type { FileUploadResponse } from '@/services/file.service';
import { messageService } from '@/services/message.service';
import { useAuthStore } from '@/store/auth.store';
import { fileToAttachment, resolveCloudFileMessageType } from '@/utils/cloudFileAttachment';

interface ShareCloudFileDialogProps {
  file: FileUploadResponse | null;
  visible: boolean;
  onClose: () => void;
}
type ShareTargetKind = 'FRIEND' | 'GROUP';
interface ShareTarget {
  key: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
}

function toTargetKey(kind: ShareTargetKind, id: string): string {
  return `${kind}:${id}`;
}

export function ShareCloudFileDialog({ file, visible, onClose }: ShareCloudFileDialogProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const { friends, privateConversations, groupConversations, isLoadingTargets } = useShareTargets(
    visible,
    currentUser?.id
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
    [friends, groupConversations, t]
  );

  const filteredTargets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return targets;
    return targets.filter(
      (target) =>
        target.title.toLowerCase().includes(query) || target.subtitle.toLowerCase().includes(query)
    );
  }, [searchQuery, targets]);

  const toggleTarget = (targetKey: string) => {
    setSelectedTargetKeys((current) =>
      current.includes(targetKey)
        ? current.filter((key) => key !== targetKey)
        : [...current, targetKey]
    );
  };

  const handleShare = async () => {
    if (!file) return;

    if (!currentUser?.id) {
      Alert.alert(t('common.error'), t('cloud.share_dialog.sign_in_required'));
      return;
    }

    if (selectedTargetKeys.length === 0) {
      Alert.alert(t('common.error'), t('cloud.share_dialog.select_target'));
      return;
    }

    setIsSharing(true);
    try {
      const targetFriends = friends.filter((friend) =>
        selectedTargetKeys.includes(toTargetKey('FRIEND', friend.id))
      );
      const targetGroups = groupConversations.filter((conversation) =>
        selectedTargetKeys.includes(toTargetKey('GROUP', conversation.id))
      );

      const friendConversationIds = await Promise.all(
        targetFriends.map(async (friend) => {
          const existingConversation = privateConversations.find(
            (conversation) =>
              conversation.participantIds.includes(friend.id) &&
              conversation.participantIds.includes(currentUser.id)
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
        })
      );

      const targetConversationIds = [
        ...new Set([
          ...friendConversationIds,
          ...targetGroups.map((conversation) => conversation.id),
        ]),
      ];

      await Promise.all(
        targetConversationIds.map(async (conversationId) => {
          const response = await messageService.send({
            conversationId,
            content: '',
            type: resolveCloudFileMessageType([file]),
            attachments: [fileToAttachment(file)],
          });

          if (response.code !== 1000 || !response.result) {
            throw new Error(response.message ?? t('cloud.share_dialog.share_failed'));
          }
        })
      );
      Alert.alert(t('mobile.common.shared'), t('cloud.share_dialog.share_success'));
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t('cloud.share_dialog.share_failed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={() => !isSharing && onClose()}
        />

        <View className="rounded-t-[28px] bg-white px-4 pb-8 pt-3">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-gray-300" />
          </View>

          <View className="mb-4 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xl font-bold text-[#1D1D1F]">{t('cloud.share_dialog.title')}</Text>
              <Text className="mt-1 text-sm leading-5 text-[#6E6E73]">
                {t('cloud.share_dialog.subtitle')}
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

          {file ? <CloudFilePreview file={file} /> : null}

          <View className="mb-4 flex-row items-center rounded-2xl border border-[#E5E5EA] bg-[#FAFAFB] px-3">
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('cloud.share_dialog.search_placeholder')}
              placeholderTextColor={Colors.textLight}
              className="ml-2 h-12 flex-1 text-sm text-[#1D1D1F]"
            />
          </View>

          {isLoadingTargets ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="small" color={Colors.cta} />
              <Text className="mt-2 text-sm text-[#6E6E73]">
                {t('cloud.share_dialog.loading_targets')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTargets}
              keyExtractor={(item) => item.key}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={
                <View className="items-center py-10">
                  <Text className="text-sm text-[#6E6E73]">{t('cloud.share_dialog.no_targets')}</Text>
                </View>
              }
              renderItem={({ item }) => (
                <ShareTargetRow
                  title={item.title}
                  subtitle={item.subtitle}
                  avatarUrl={item.avatarUrl}
                  isSelected={selectedTargetKeys.includes(item.key)}
                  onPress={() => toggleTarget(item.key)}
                />
              )}
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

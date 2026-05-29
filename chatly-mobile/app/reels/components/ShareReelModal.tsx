import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { contactService } from '@/services/contact.service';
import { conversationService } from '@/services/conversation.service';
import { messageService } from '@/services/message.service';
import { reelService } from '@/services/reel.service';
import { useAuthStore } from '@/store/auth.store';
import type { ContactResponse } from '@/types/contact';
import type { Attachment } from '@/types/message';
import type { Reel } from '@/types/reel';
import { getApiErrorMessage } from '@/utils/errorHandler';

interface ShareReelModalProps {
  reel: Reel | null;
  visible: boolean;
  onClose: () => void;
  onShared: (updatedReel: Reel) => void;
}

interface ShareFriend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

function getOtherUser(contact: ContactResponse, currentUserId: string | undefined): ShareFriend {
  const user = contact.user.id === currentUserId ? contact.contact : contact.user;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

interface ReelAttachment extends Attachment {
  kind?: "POST_PREVIEW" | "REEL_PREVIEW" | "STORY_REPLY";
  targetUrl?: string;
  postTitle?: string;
  postExcerpt?: string;
  postAuthorName?: string;
  postAuthorAvatarUrl?: string;
  reelId?: string;
  reelCaption?: string;
  reelVideoUrl?: string;
  reelAuthorName?: string;
  reelAuthorAvatarUrl?: string;
}

function buildPreviewAttachment(
  reel: Reel,
  fallbackAuthorName?: string,
  fallbackAuthorAvatarUrl?: string
): ReelAttachment {
  const caption = reel.caption.trim().replace(/\s+/g, ' ');
  const targetUrl = `/reels?reelId=${reel.id}`;
  const authorName = reel.authorDisplayName ?? reel.authorUsername ?? fallbackAuthorName ?? 'Chatly user';
  return {
    kind: 'REEL_PREVIEW',
    type: 'application/x-chatly-reel-preview',
    url: reel.videoUrl,
    targetUrl,
    name: caption.slice(0, 60) || 'Shared reel',
    postTitle: caption.slice(0, 80) || 'Shared reel',
    postExcerpt: caption.slice(0, 180) || 'Open this reel to watch the video.',
    postAuthorName: authorName,
    postAuthorAvatarUrl: reel.authorAvatarUrl ?? fallbackAuthorAvatarUrl,
    reelId: reel.id,
    reelCaption: caption.slice(0, 180) || 'Open this reel to watch the video.',
    reelVideoUrl: reel.videoUrl,
    reelAuthorName: authorName,
    reelAuthorAvatarUrl: reel.authorAvatarUrl ?? fallbackAuthorAvatarUrl,
  };
}

export function ShareReelModal({ reel, visible, onClose, onShared }: ShareReelModalProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const [friends, setFriends] = useState<ShareFriend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const previewAttachment = useMemo(
    () => (reel ? buildPreviewAttachment(reel, currentUser?.displayName, currentUser?.avatarUrl) : null),
    [currentUser?.avatarUrl, currentUser?.displayName, reel]
  );

  useEffect(() => {
    if (!visible) return;

    setIsLoadingFriends(true);
    contactService
      .getByStatus('ACCEPTED')
      .then((response) => {
        setFriends(
          (response.result ?? []).map((contact) => getOtherUser(contact, currentUser?.id))
        );
      })
      .catch((error: unknown) => {
        Alert.alert(
          t('errors.request_failed'),
          getApiErrorMessage(error, t('mobile.reels.load_friends_failed')),
        );
      })
      .finally(() => {
        setIsLoadingFriends(false);
      });
  }, [visible, currentUser?.id]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedFriendIds([]);
    }
  }, [visible]);

  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      friend.displayName.toLowerCase().includes(query) ||
      friend.username.toLowerCase().includes(query)
    );
  });

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    );
  };

  const handleShare = async () => {
    if (!currentUser?.id || !reel || !previewAttachment) {
      Alert.alert(t('errors.request_failed'), t('mobile.reels.sign_in_to_share'));
      return;
    }

    if (selectedFriendIds.length === 0) {
      Alert.alert(t('mobile.common.info'), t('mobile.reels.select_friend_warning'));
      return;
    }

    setIsSharing(true);
    try {
      const conversationsRes = await conversationService.getMyConversations();
      const conversations = conversationsRes.result ?? [];
      const targetFriends = friends.filter((friend) => selectedFriendIds.includes(friend.id));

      await Promise.all(
        targetFriends.map(async (friend) => {
          const existingConversation = conversations.find(
            (conversation) =>
              conversation.type === 'PRIVATE' &&
              conversation.participantIds.includes(friend.id) &&
              conversation.participantIds.includes(currentUser.id)
          );

          const conversation =
            existingConversation ??
            (await conversationService.create({
              type: 'PRIVATE',
              participantIds: [friend.id],
            })).result;

          if (!conversation) throw new Error('Unable to open conversation');

          await messageService.send({
            conversationId: conversation.id,
            content: t('mobile.reels.shared_in_chat'),
            attachments: [previewAttachment],
          });
        })
      );

      const shareResponse = await reelService.share(reel.id);
      if (shareResponse.result) onShared(shareResponse.result);
      Alert.alert(t('mobile.common.success'), t('mobile.reels.share_success', { count: targetFriends.length }));
      onClose();
    } catch (error: unknown) {
      Alert.alert(t('errors.request_failed'), getApiErrorMessage(error, t('mobile.reels.share_failed')));
    } finally {
      setIsSharing(false);
    }
  };

  const selectedCount = selectedFriendIds.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0" />

        <View className="bg-white rounded-t-3xl h-[65%] w-full overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <View>
              <Text className="text-lg font-bold text-gray-900">{t('mobile.reels.share_title')}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{t('mobile.reels.share_subtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="px-4 py-2 border-b border-gray-100 flex-row items-center bg-gray-50 m-4 rounded-xl">
            <Ionicons name="search" size={16} color={Colors.textMuted} className="mr-2" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('mobile.reels.share_search')}
              className="flex-1 py-1 text-sm text-gray-900"
            />
          </View>

          {/* List Area */}
          <View className="flex-1 px-4">
            {isLoadingFriends ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="small" color={Colors.cta} />
                <Text className="text-xs text-gray-500 mt-2">{t('mobile.reels.share_loading')}</Text>
              </View>
            ) : filteredFriends.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-xs text-gray-500">{t('mobile.reels.share_empty')}</Text>
              </View>
            ) : (
              <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedFriendIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      onPress={() => toggleFriend(item.id)}
                      activeOpacity={0.7}
                      className={`flex-row items-center justify-between p-3 mb-2 rounded-2xl border ${
                        isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'
                      }`}>
                      <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                          {item.avatarUrl ? (
                            <Image
                              source={{ uri: item.avatarUrl }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                            />
                          ) : (
                            <View className="flex-1 items-center justify-center bg-gray-400">
                              <Text className="text-white text-xs font-semibold">
                                {item.displayName.slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View>
                          <Text className="text-sm font-bold text-gray-900">{item.displayName}</Text>
                          <Text className="text-xs text-gray-500">@{item.username}</Text>
                        </View>
                      </View>
                      <View
                        className={`h-5 w-5 rounded-full items-center justify-center border ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Footer Action */}
          <View className="flex-row gap-3 border-t border-gray-200 bg-white px-4 pb-8 pt-4">
            <TouchableOpacity
              onPress={onClose}
              disabled={isSharing}
              className="flex-1 items-center justify-center rounded-2xl bg-gray-100 py-3.5">
              <Text className="text-sm font-bold text-gray-800">{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing || selectedCount === 0}
              className={`flex-1 items-center justify-center rounded-2xl py-3.5 ${
                isSharing || selectedCount === 0 ? 'bg-blue-300' : 'bg-blue-500'
              }`}>
              {isSharing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {t('mobile.reels.share_button')}
                  {selectedCount > 0 ? ` (${selectedCount})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

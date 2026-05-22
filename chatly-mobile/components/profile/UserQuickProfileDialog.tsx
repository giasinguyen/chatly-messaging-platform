import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { contactService } from '@/services/contact.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/auth.store';
import { useContactStore } from '@/store/contact.store';
import type { UserResponse } from '@/types/auth';
import type { ContactResponse } from '@/types/contact';
import { getApiErrorMessage } from '@/utils/errorHandler';

interface UserQuickProfileDialogProps {
  visible: boolean;
  userId: string | null;
  fallbackDisplayName?: string;
  fallbackAvatarUrl?: string;
  onClose: () => void;
  onMessage?: (userId: string) => void | Promise<void>;
}

function getRelationLabel(
  contactRecord: ContactResponse | null,
  currentUserId?: string,
): string | null {
  if (!contactRecord) {
    return null;
  }

  if (contactRecord.status === 'ACCEPTED') {
    return 'Friends';
  }

  if (contactRecord.status === 'PENDING') {
    return contactRecord.contact.id === currentUserId ? 'Incoming request' : 'Request sent';
  }

  if (contactRecord.status === 'BLOCKED') {
    return contactRecord.blockedBy === currentUserId ? 'Blocked by you' : 'Blocked you';
  }

  return null;
}

export function UserQuickProfileDialog({
  visible,
  userId,
  fallbackDisplayName,
  fallbackAvatarUrl,
  onClose,
  onMessage,
}: UserQuickProfileDialogProps) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const invalidateContacts = useContactStore((state) => state.invalidate);

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [contactRecord, setContactRecord] = useState<ContactResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === userId;
  const relationLabel = getRelationLabel(contactRecord, currentUser?.id);
  const isBlocked = contactRecord?.status === 'BLOCKED';
  const blockedByMe = isBlocked && contactRecord?.blockedBy === currentUser?.id;
  const blockedByOther = isBlocked && contactRecord?.blockedBy !== currentUser?.id;
  const displayName = profile?.displayName ?? fallbackDisplayName ?? 'Unknown user';
  const avatarUrl = profile?.avatarUrl ?? fallbackAvatarUrl;

  const loadProfile = useCallback(async () => {
    if (!visible || !userId) {
      return;
    }

    setIsLoading(true);
    try {
      setErrorMessage(null);
      const [profileResponse, contactResponse] = await Promise.all([
        userService.getById(userId),
        isOwnProfile ? Promise.resolve(null) : contactService.getByUser(userId),
      ]);
      setProfile(profileResponse.result ?? null);
      setContactRecord(contactResponse?.result ?? null);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Could not load profile preview.'));
    } finally {
      setIsLoading(false);
    }
  }, [isOwnProfile, userId, visible]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleViewProfile = () => {
    if (!userId) {
      return;
    }

    onClose();
    router.push(`/profile/${userId}`);
  };

  const handleBlockToggle = async () => {
    if (!userId || isOwnProfile || blockedByOther) {
      return;
    }

    setIsActionLoading(true);
    try {
      if (blockedByMe) {
        await contactService.unblockByUser(userId);
      } else {
        await contactService.blockByUser(userId);
      }
      invalidateContacts();
      await loadProfile();
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Could not update block status.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!userId || !onMessage) {
      return;
    }

    onClose();
    await onMessage(userId);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-[360px] rounded-3xl bg-white px-5 pb-5 pt-4"
          onPress={() => {}}
        >
          <View className="flex-row items-start justify-between">
            <Text className="text-lg font-semibold text-[#1D1D1F]">Profile</Text>
            <TouchableOpacity onPress={onClose} className="rounded-full bg-[#F5F5F7] p-2">
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color={Colors.cta} />
            </View>
          ) : (
            <>
              <View className="items-center pb-2 pt-4">
                <Avatar uri={avatarUrl} name={displayName} size={72} />
                <Text className="mt-3 text-lg font-semibold text-[#1D1D1F]">{displayName}</Text>
                {profile?.username ? (
                  <Text className="mt-1 text-sm text-[#6E6E73]">@{profile.username}</Text>
                ) : null}
                {relationLabel ? (
                  <View className="mt-3 rounded-full bg-[#EEF5FF] px-3 py-1.5">
                    <Text className="text-xs font-semibold text-[#0A7AFF]">{relationLabel}</Text>
                  </View>
                ) : null}
                {profile?.bio ? (
                  <Text className="mt-3 text-center text-sm leading-5 text-[#1D1D1F]">
                    {profile.bio}
                  </Text>
                ) : null}
                {errorMessage ? (
                  <Text className="mt-3 text-center text-sm text-[#FF3B30]">{errorMessage}</Text>
                ) : null}
              </View>

              <View className="mt-4 gap-2">
                <TouchableOpacity
                  onPress={handleViewProfile}
                  className="h-11 flex-row items-center justify-center rounded-xl bg-[#0A7AFF] active:opacity-80"
                >
                  <Ionicons name="person-outline" size={16} color={Colors.white} />
                  <Text className="ml-2 text-sm font-semibold text-white">View profile</Text>
                </TouchableOpacity>

                {onMessage && !isOwnProfile && !blockedByOther ? (
                  <TouchableOpacity
                    onPress={() => void handleMessage()}
                    className="h-11 flex-row items-center justify-center rounded-xl border border-[#D1D1D6] active:opacity-75"
                    disabled={isActionLoading}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={Colors.text} />
                    <Text className="ml-2 text-sm font-semibold text-[#1D1D1F]">Message</Text>
                  </TouchableOpacity>
                ) : null}

                {!isOwnProfile ? (
                  <TouchableOpacity
                    onPress={() => void handleBlockToggle()}
                    className="h-11 flex-row items-center justify-center rounded-xl border border-[#E5E5EA] active:opacity-75"
                    disabled={isActionLoading || blockedByOther}
                    style={{ opacity: isActionLoading || blockedByOther ? 0.55 : 1 }}
                  >
                    {isActionLoading ? (
                      <ActivityIndicator size="small" color={Colors.textMuted} />
                    ) : (
                      <>
                        <Ionicons
                          name={blockedByMe ? 'lock-open-outline' : 'ban-outline'}
                          size={16}
                          color={blockedByOther ? Colors.textMuted : '#FF3B30'}
                        />
                        <Text
                          className="ml-2 text-sm font-semibold"
                          style={{ color: blockedByOther ? Colors.textMuted : '#FF3B30' }}
                        >
                          {blockedByOther ? 'Blocked' : blockedByMe ? 'Unblock user' : 'Block user'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import type { UserResponse } from '@/types/auth';

type ProfileAction = 'add' | 'accept' | 'blocked' | 'cancel' | 'edit' | 'unfriend';

interface ProfileHeaderProps {
  profile: UserResponse;
  friendCount: number;
  postCount: number;
  primaryAction: ProfileAction;
  isActionLoading: boolean;
  onPrimaryAction: () => void;
  onMessage?: () => void;
}

const ACTION_LABEL_KEYS: Record<ProfileAction, string> = {
  add: 'profile.add_friend',
  accept: 'mobile.profile.accept_request',
  blocked: 'mobile.profile.action_blocked',
  cancel: 'profile.cancel_request',
  edit: 'profile.edit_profile',
  unfriend: 'profile.unfriend',
};

const ACTION_ICONS: Record<ProfileAction, keyof typeof Ionicons.glyphMap> = {
  add: 'person-add-outline',
  accept: 'checkmark-circle-outline',
  blocked: 'ban-outline',
  cancel: 'close-circle-outline',
  edit: 'create-outline',
  unfriend: 'person-remove-outline',
};

export function ProfileHeader({
  profile,
  friendCount,
  postCount,
  primaryAction,
  isActionLoading,
  onPrimaryAction,
  onMessage,
}: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="border-b px-4 pb-5 pt-4" style={{ backgroundColor: Colors.bgCard, borderBottomColor: Colors.borderLight }}>
      <View className="flex-row items-center">
        <Avatar uri={profile.avatarUrl} name={profile.displayName} size={84} />
        <View className="ml-5 flex-1 flex-row justify-around">
          <ProfileStat count={postCount} label={t('profile.posts')} />
          <ProfileStat count={friendCount} label={t('mobile.profile.friends_label')} />
        </View>
      </View>

      <View className="mt-4">
        <Text className="text-base font-bold" style={{ color: Colors.text }}>{profile.displayName}</Text>
        <Text className="mt-0.5 text-sm" style={{ color: Colors.textMuted }}>@{profile.username}</Text>
        {profile.bio ? (
          <Text className="mt-2 text-sm leading-5" style={{ color: Colors.text }}>{profile.bio}</Text>
        ) : null}
      </View>

      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          onPress={onPrimaryAction}
          disabled={isActionLoading || primaryAction === 'blocked'}
          className="h-10 flex-1 flex-row items-center justify-center rounded-lg bg-[#0A7AFF] px-3 active:opacity-80">
          {isActionLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name={ACTION_ICONS[primaryAction]} size={16} color={Colors.white} />
              <Text className="ml-1.5 text-sm font-semibold text-white">
                {t(ACTION_LABEL_KEYS[primaryAction])}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {onMessage ? (
          <TouchableOpacity
            onPress={onMessage}
            disabled={isActionLoading}
            className="h-10 flex-1 flex-row items-center justify-center rounded-lg border px-3 active:opacity-75"
            style={{ borderColor: Colors.borderLight }}>
            <Ionicons name="chatbubble-outline" size={16} color={Colors.text} />
            <Text className="ml-1.5 text-sm font-semibold" style={{ color: Colors.text }}>
              {t('profile.message')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mt-5 flex-row items-center border-t pt-4" style={{ borderTopColor: Colors.borderLight }}>
        <Ionicons name="grid-outline" size={18} color={Colors.text} />
        <Text className="ml-2 text-sm font-semibold" style={{ color: Colors.text }}>{t('profile.posts')}</Text>
      </View>
    </View>
  );
}

function ProfileStat({ count, label }: { count: number; label: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold" style={{ color: Colors.text }}>{count}</Text>
      <Text className="text-xs" style={{ color: Colors.textMuted }}>{label}</Text>
    </View>
  );
}

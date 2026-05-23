import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePostTile } from '@/components/profile/ProfilePostTile';
import { PROFILE_POST_GRID_PAGE_SIZE } from '@/constants/feed';
import { Colors } from '@/constants/theme';
import { contactService } from '@/services/contact.service';
import { conversationService } from '@/services/conversation.service';
import { postService } from '@/services/post.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/auth.store';
import { useContactStore } from '@/store/contact.store';
import { useConversationStore } from '@/store/conversation.store';
import { useThemeStore } from '@/store/theme.store';
import type { UserResponse } from '@/types/auth';
import type { ContactResponse } from '@/types/contact';
import type { Post } from '@/types/post';
import { getApiErrorMessage } from '@/utils/errorHandler';

export type ProfileAction = 'add' | 'accept' | 'blocked' | 'cancel' | 'edit' | 'unfriend';

function getProfileAction(
  isOwnProfile: boolean,
  contactRecord: ContactResponse | null,
  currentUserId?: string
): ProfileAction {
  if (isOwnProfile) return 'edit';
  if (contactRecord?.status === 'ACCEPTED') return 'unfriend';
  if (contactRecord?.status === 'BLOCKED') return 'blocked';
  if (contactRecord?.status !== 'PENDING') return 'add';
  return contactRecord.contact.id === currentUserId ? 'accept' : 'cancel';
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useThemeStore((state) => state.isDarkMode);
  const currentUser = useAuthStore((state) => state.user);
  const invalidateContacts = useContactStore((state) => state.invalidate);
  const conversations = useConversationStore((state) => state.conversations);

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [contactRecord, setContactRecord] = useState<ContactResponse | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === userId;
  const profileAction = getProfileAction(isOwnProfile, contactRecord, currentUser?.id);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setErrorMessage('Invalid user id.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setErrorMessage(null);
      const contactRequest = isOwnProfile
        ? Promise.resolve(null)
        : contactService.getByUser(userId);
      const [profileResponse, contactResponse, friendResponse, postResponse] = await Promise.all([
        userService.getById(userId),
        contactRequest,
        contactService.getFriendCount(userId),
        postService.getByAuthor(userId, 0, PROFILE_POST_GRID_PAGE_SIZE),
      ]);
      setProfile(profileResponse.result);
      setContactRecord(contactResponse?.result ?? null);
      setFriendCount(friendResponse.result ?? 0);
      setPostCount(postResponse.result?.totalElements ?? 0);
      setPosts(postResponse.result?.content ?? []);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Could not load profile.'));
    } finally {
      setIsLoading(false);
    }
  }, [isOwnProfile, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const openConversation = useCallback(async () => {
    if (!userId || !currentUser) return;
    const existingConversation = conversations.find(
      (conversation) =>
        conversation.type === 'PRIVATE' &&
        conversation.participantIds.includes(userId) &&
        conversation.participantIds.includes(currentUser.id)
    );
    if (existingConversation) {
      router.push(`/chat/${existingConversation.id}`);
      return;
    }

    const response = await conversationService.create({
      type: 'PRIVATE',
      participantIds: [userId],
    });
    router.push(`/chat/${response.result.id}`);
  }, [conversations, currentUser, router, userId]);

  const handleProfileAction = useCallback(async () => {
    if (!userId) return;
    if (profileAction === 'blocked') return;
    if (profileAction === 'edit') {
      router.push('/(tabs)/settings');
      return;
    }

    setIsActionLoading(true);
    try {
      if (profileAction === 'add') {
        await contactService.sendRequest({ contactId: userId });
        await loadProfile();
      } else if (profileAction === 'accept' && contactRecord) {
        await contactService.accept(contactRecord.id);
        invalidateContacts();
        await loadProfile();
      } else if (profileAction === 'cancel' && contactRecord) {
        await contactService.delete(contactRecord.id);
        await loadProfile();
      } else if (profileAction === 'unfriend' && contactRecord) {
        await contactService.delete(contactRecord.id);
        invalidateContacts();
        await loadProfile();
      }
    } catch (error: unknown) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not update profile action.'));
    } finally {
      setIsActionLoading(false);
    }
  }, [contactRecord, invalidateContacts, loadProfile, profileAction, router, userId]);

  const handleMessage = useCallback(async () => {
    setIsActionLoading(true);
    try {
      await openConversation();
    } catch (error: unknown) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not open conversation.'));
    } finally {
      setIsActionLoading(false);
    }
  }, [openConversation]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/home');
  }, [router]);

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    );
  }

  if (!profile || errorMessage) {
    return (
      <View className="flex-1 px-5" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
        <ProfileNav onBack={handleBack} title="Profile" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base font-semibold" style={{ color: Colors.text }}>Profile not found</Text>
          <Text className="mt-1 text-center text-sm" style={{ color: Colors.textMuted }}>
            {errorMessage ?? 'This profile is unavailable.'}
          </Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-[#0A7AFF] px-4 py-2 active:opacity-80"
            onPress={() => void loadProfile()}>
            <Text className="text-sm font-semibold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
      <ProfileNav onBack={handleBack} title={profile.username} />
      <FlatList
        data={posts}
        numColumns={3}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <ProfilePostTile post={item} onPress={() => router.push(`/post/${item.id}`)} />
        )}
        ListHeaderComponent={
          <ProfileHeader
            profile={profile}
            friendCount={friendCount}
            postCount={postCount}
            primaryAction={profileAction}
            isActionLoading={isActionLoading}
            onPrimaryAction={() => void handleProfileAction()}
            onMessage={
              profileAction === 'blocked' || isOwnProfile ? undefined : () => void handleMessage()
            }
          />
        }
        ListEmptyComponent={
          <View className="items-center px-6 py-14">
            <Ionicons name="grid-outline" size={34} color={Colors.textLight} />
            <Text className="mt-3 text-sm font-medium" style={{ color: Colors.textMuted }}>No posts yet</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function ProfileNav({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center border-b px-4 py-3" style={{ backgroundColor: Colors.bgCard, borderBottomColor: Colors.borderLight }}>
      <TouchableOpacity onPress={onBack} className="p-1 active:opacity-75">
        <Ionicons name="chevron-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text className="ml-2 flex-1 text-base font-bold" style={{ color: Colors.text }} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

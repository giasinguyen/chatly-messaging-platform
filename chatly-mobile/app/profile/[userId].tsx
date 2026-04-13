import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { userService } from '@/services/user.service';
import { contactService } from '@/services/contact.service';
import { conversationService } from '@/services/conversation.service';
import { useAuthStore } from '@/store/auth.store';
import { useContactStore } from '@/store/contact.store';
import { useConversationStore } from '@/store/conversation.store';
import type { UserResponse } from '@/types/auth';
import type { ContactResponse } from '@/types/contact';

function formatJoinedAt(createdAt?: string) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const conversations = useConversationStore((s) => s.conversations);
  const invalidateContacts = useContactStore((s) => s.invalidate);

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [contactRecord, setContactRecord] = useState<ContactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect if viewing own profile
  useEffect(() => {
    if (userId && currentUser?.id && userId === currentUser.id) {
      router.replace('/(tabs)/settings');
    }
  }, [userId, currentUser?.id, router]);

  const loadData = useCallback(async () => {
    if (!userId || userId === currentUser?.id) return;
    setLoading(true);
    try {
      const [profileRes, contactRes] = await Promise.all([
        userService.getById(userId),
        contactService.getByUser(userId),
      ]);
      setProfile(profileRes.result);
      setContactRecord(contactRes.result ?? null);
    } catch {
      Alert.alert('Error', 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const contactStatus = contactRecord?.status ?? null;
  const direction =
    contactStatus !== 'BLOCKED'
      ? null
      : contactRecord?.blockedBy === currentUser?.id
        ? 'I_BLOCKED'
        : 'BLOCKED_ME';

  const isLimited = profile?.limited === true || direction === 'BLOCKED_ME';
  const iSentRequest =
    contactStatus === 'PENDING' && contactRecord?.user.id === currentUser?.id;
  const theySentRequest =
    contactStatus === 'PENDING' && contactRecord?.contact.id === currentUser?.id;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSendFriendRequest = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await contactService.sendRequest({ contactId: userId });
      Alert.alert('Success', 'Friend request sent!');
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!contactRecord) return;
    setActionLoading(true);
    try {
      await contactService.accept(contactRecord.id);
      invalidateContacts();
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!contactRecord) return;
    setActionLoading(true);
    try {
      await contactService.delete(contactRecord.id);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = () => {
    if (!contactRecord || !profile) return;
    Alert.alert(
      'Remove friend?',
      `Are you sure you want to remove ${profile.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await contactService.delete(contactRecord.id);
              invalidateContacts();
              await loadData();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Could not remove friend');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    if (!userId || !profile) return;
    Alert.alert(
      `Block ${profile.displayName}?`,
      "They won't be able to message you or view your full profile.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await contactService.blockByUser(userId);
              setContactRecord(res.result);
              invalidateContacts();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Could not block user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleUnblock = () => {
    if (!userId || !profile) return;
    Alert.alert(
      `Unblock ${profile.displayName}?`,
      'They will be able to message you and send friend requests again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await contactService.unblockByUser(userId);
              setContactRecord(res.result);
              invalidateContacts();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Could not unblock user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleMessage = async () => {
    if (!userId || !currentUser) return;
    const existing = conversations.find(
      (c) =>
        c.type === 'PRIVATE' &&
        c.participantIds.includes(userId) &&
        c.participantIds.includes(currentUser.id),
    );
    if (existing) {
      router.push(`/chat/${existing.id}`);
      return;
    }
    try {
      const res = await conversationService.create({
        type: 'PRIVATE',
        participantIds: [userId],
      });
      router.push(`/chat/${res.result.id}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not open conversation');
    }
  };

  const handleShareProfile = async () => {
    if (!userId) return;
    await Share.share({ message: `chatly://profile/${userId}` });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
        {/* Header skeleton */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: Colors.white,
            borderBottomWidth: 0.5,
            borderBottomColor: Colors.borderLight,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={Colors.cta} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: Colors.text, marginLeft: 8 }}>
            Profile
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: Colors.white,
            borderBottomWidth: 0.5,
            borderBottomColor: Colors.borderLight,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={Colors.cta} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="person-outline" size={48} color={Colors.textLight} />
          <Text style={{ color: Colors.textMuted, fontSize: 15 }}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const joinedAt = formatJoinedAt(profile.createdAt);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: Colors.white,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={Colors.cta} />
        </TouchableOpacity>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: '600', color: Colors.text, marginLeft: 8 }}
          numberOfLines={1}
        >
          {profile.displayName}
        </Text>
        <TouchableOpacity
          onPress={handleShareProfile}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-outline" size={22} color={Colors.cta} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Block status banners */}
        {direction === 'I_BLOCKED' && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#FFF0F0',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="ban-outline" size={18} color={Colors.error} />
            <Text style={{ flex: 1, fontSize: 14, color: Colors.error }}>
              You have blocked this user.
            </Text>
          </View>
        )}
        {direction === 'BLOCKED_ME' && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#F5F5F7',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="shield-outline" size={18} color={Colors.textMuted} />
            <Text style={{ flex: 1, fontSize: 14, color: Colors.textMuted }}>
              This user has restricted their profile.
            </Text>
          </View>
        )}

        {/* Avatar + name card */}
        <View
          style={{
            margin: 16,
            backgroundColor: Colors.white,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Avatar uri={profile.avatarUrl} name={profile.displayName} size={88} />
          <View style={{ marginTop: 14, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.text }}>
              {profile.displayName}
            </Text>
            <Text style={{ fontSize: 14, color: Colors.textMuted }}>
              @{profile.username}
            </Text>

            {/* Status badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 6 }}>
              {direction === 'I_BLOCKED' && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 99,
                    backgroundColor: '#FFEDED',
                  }}
                >
                  <Ionicons name="ban-outline" size={12} color={Colors.error} />
                  <Text style={{ fontSize: 12, color: Colors.error, fontWeight: '600' }}>Blocked</Text>
                </View>
              )}
              {isLimited && direction !== 'I_BLOCKED' && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 99,
                    backgroundColor: '#FFF8E1',
                  }}
                >
                  <Ionicons name="shield-outline" size={12} color="#B08800" />
                  <Text style={{ fontSize: 12, color: '#B08800', fontWeight: '600' }}>Limited profile</Text>
                </View>
              )}
              {contactStatus === 'ACCEPTED' && !direction && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 99,
                    backgroundColor: '#E8F5E9',
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={12} color={Colors.success} />
                  <Text style={{ fontSize: 12, color: Colors.success, fontWeight: '600' }}>Friends</Text>
                </View>
              )}
            </View>

            {!isLimited && profile.bio && (
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.textMuted,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                {profile.bio}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          {actionLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={Colors.cta} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20, width: '100%' }}>
              {/* I BLOCKED */}
              {direction === 'I_BLOCKED' && (
                <ActionButton
                  icon="lock-open-outline"
                  label="Unblock"
                  color={Colors.cta}
                  onPress={handleUnblock}
                />
              )}

              {/* NORMAL — no contact */}
              {!direction && !contactStatus && (
                <ActionButton
                  icon="person-add-outline"
                  label="Add Friend"
                  color={Colors.cta}
                  onPress={handleSendFriendRequest}
                />
              )}

              {/* I sent a request */}
              {!direction && iSentRequest && (
                <ActionButton
                  icon="close-outline"
                  label="Cancel Request"
                  color={Colors.textMuted}
                  onPress={handleCancelRequest}
                />
              )}

              {/* They sent a request */}
              {!direction && theySentRequest && (
                <>
                  <ActionButton
                    icon="checkmark-outline"
                    label="Accept"
                    color={Colors.success}
                    onPress={handleAcceptRequest}
                  />
                  <ActionButton
                    icon="close-outline"
                    label="Decline"
                    color={Colors.error}
                    onPress={handleCancelRequest}
                  />
                </>
              )}

              {/* Already friends */}
              {!direction && contactStatus === 'ACCEPTED' && (
                <>
                  <ActionButton
                    icon="chatbubble-outline"
                    label="Message"
                    color={Colors.cta}
                    onPress={handleMessage}
                  />
                  <ActionButton
                    icon="person-remove-outline"
                    label="Remove"
                    color={Colors.textMuted}
                    onPress={handleRemoveFriend}
                  />
                  <ActionButton
                    icon="ban-outline"
                    label="Block"
                    color={Colors.error}
                    onPress={handleBlock}
                  />
                </>
              )}

              {/* No relation (not friends, not blocked) — can still block */}
              {!direction && !contactStatus && (
                <ActionButton
                  icon="ban-outline"
                  label="Block"
                  color={Colors.error}
                  onPress={handleBlock}
                />
              )}

              {/* Pending requests — can still block */}
              {!direction && (iSentRequest || theySentRequest) && (
                <ActionButton
                  icon="ban-outline"
                  label="Block"
                  color={Colors.error}
                  onPress={handleBlock}
                />
              )}
            </View>
          )}
        </View>

        {/* Info rows — hidden when limited */}
        {!isLimited && (
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: Colors.white,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {profile.email && (
              <InfoRow icon="mail-outline" label="Email" value={profile.email} />
            )}
            {profile.phone && (
              <InfoRow icon="call-outline" label="Phone" value={profile.phone} last={!profile.dob && !joinedAt} />
            )}
            {profile.dob && (
              <InfoRow icon="calendar-outline" label="Birthday" value={profile.dob} last={!joinedAt} />
            )}
            {joinedAt && (
              <InfoRow icon="time-outline" label="Joined" value={joinedAt} last />
            )}
            {!profile.email && !profile.phone && !profile.dob && !joinedAt && (
              <View style={{ padding: 20 }}>
                <Text style={{ color: Colors.textLight, fontSize: 14, textAlign: 'center' }}>
                  No additional info available
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color === Colors.cta ? Colors.cta : Colors.borderLight,
        backgroundColor: color === Colors.cta ? Colors.ctaLight : Colors.bg,
        minWidth: 80,
        gap: 4,
      }}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: Colors.borderLight,
        gap: 12,
      }}
    >
      <Ionicons name={icon} size={18} color={Colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 1 }}>{label}</Text>
        <Text style={{ fontSize: 15, color: Colors.text }}>{value}</Text>
      </View>
    </View>
  );
}

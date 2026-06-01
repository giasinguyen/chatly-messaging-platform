import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Linking,
  ScrollView,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import * as Clipboard from 'expo-clipboard';

import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { UserQuickProfileDialog } from '@/components/profile/UserQuickProfileDialog';

import { groupService } from '@/services/group.service';
import { conversationService } from '@/services/conversation.service';
import { contactService } from '@/services/contact.service';
import { fileService, type FileUploadResponse } from '@/services/file.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { isConvMuted, useConversationPrefsStore } from '@/store/conversationPrefs.store';
import { useNotificationStore } from '@/store/notification.store';
import { useThemeStore } from '@/store/theme.store';
import { buildWebJoinLink } from '@/lib/webConfig';
import { Colors } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import type {
  GroupMemberResponse,
  GroupRole,
  PendingJoinResponse,
  GroupReminderResponse,
  GroupNoteResponse,
} from '@/types/group';
import type { ContactResponse } from '@/types/contact';
import type { UserResponse } from '@/types/auth';

export default function GroupInfoScreen() {
  const { t } = useTranslation();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useThemeStore((state) => state.isDarkMode);
  const user = useAuthStore((s) => s.user);

  const conversations = useConversationStore((s) => s.conversations);
  const setConversations = useConversationStore((s) => s.setConversations);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const conversation = conversations.find((c) => c.id === conversationId);
  const isGroup = conversation?.type === 'GROUP';

  const { prefs, hydrate, setPin, setMute, setNickname } = useConversationPrefsStore();
  const convPrefs = prefs[conversationId ?? ''] ?? {};
  const isPinned = convPrefs.isPinned ?? false;
  const isEffMuted = isConvMuted(convPrefs);
  const nickname = convPrefs.nickname ?? '';
  const muteUntil = convPrefs.muteUntil;
  const muteUntilLabel = !isEffMuted
    ? ''
    : muteUntil == null
      ? t('chat.mute_forever')
      : t('mobile.chat.mute_until_time', {
          time: new Date(muteUntil).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });

  useEffect(() => {
    hydrate();
  }, []);

  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [quickProfileMember, setQuickProfileMember] = useState<GroupMemberResponse | null>(null);

  // For 1-1 chats: the other participant
  const [otherUser, setOtherUser] = useState<UserResponse | null>(null);

  // Contacts
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [muteModalVisible, setMuteModalVisible] = useState(false);

  // Media & files
  const [mediaFiles, setMediaFiles] = useState<FileUploadResponse[]>([]);
  const [docFiles, setDocFiles] = useState<FileUploadResponse[]>([]);

  // Lightbox
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const mediaImageUrls = mediaFiles.slice(0, 4).map((f) => f.url);

  const openMediaLightbox = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxVisible(true);
  };

  // Invite link
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);

  // Pending requests
  const [pendingRequests, setPendingRequests] = useState<PendingJoinResponse[]>([]);

  // Require approval
  const [requireApproval, setRequireApproval] = useState(conversation?.requireApproval ?? false);

  // AI proactive
  const [aiProactiveEnabled, setAiProactiveEnabled] = useState(
    conversation?.aiProactiveEnabled ?? false
  );

  // Reminders & notes
  const [reminders, setReminders] = useState<GroupReminderResponse[]>([]);
  const [notes, setNotes] = useState<GroupNoteResponse[]>([]);
  const [remindersVisible, setRemindersVisible] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!conversationId || !isGroup) return;
    try {
      setLoading(true);
      const res = await groupService.getMembers(conversationId);
      setMembers(res.result);
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, isGroup]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Fetch other user profile for 1-1 chats
  useEffect(() => {
    if (isGroup || !conversation || !user) return;
    const otherId = conversation.participantIds.find((id) => id !== user.id);
    if (!otherId) return;
    userService
      .getById(otherId)
      .then((res) => setOtherUser(res.result))
      .catch(console.error);
  }, [isGroup, conversation, user]);

  // Fetch media & files
  useEffect(() => {
    if (!conversationId) return;
    fileService.getByConversation(conversationId, 'image').then(setMediaFiles).catch(console.error);
    fileService.getByConversation(conversationId, 'file').then(setDocFiles).catch(console.error);
  }, [conversationId]);

  const fetchContacts = async () => {
    try {
      const res = await contactService.getByStatus('ACCEPTED');
      setContacts(res.result);
    } catch (err) {
      console.error(err);
    }
  };

  const currentUserRole = useMemo(() => {
    const me = members.find((m) => m.userId === user?.id);
    return me?.role ?? 'MEMBER';
  }, [members, user?.id]);

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // Realtime pending requests: re-fetch when a GROUP_JOIN_REQUEST notification arrives
  const notifications = useNotificationStore((s) => s.notifications);
  const removeByTypeAndReference = useNotificationStore((s) => s.removeByTypeAndReference);
  const joinRequestCount = useMemo(
    () =>
      notifications.filter(
        (n) => n.type === 'GROUP_JOIN_REQUEST' && n.referenceId === conversationId
      ).length,
    [notifications, conversationId]
  );
  useEffect(() => {
    if (canManage) fetchPendingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinRequestCount, canManage]);

  const handleChangeName = () => {
    if (!canManage) return;
    Alert.prompt(
      t('chat.change_group_name'),
      t('chat.group_name_placeholder'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.save'),
          onPress: async (newName?: string) => {
            if (!newName || !newName.trim()) return;
            try {
              const res = await groupService.updateGroup(conversationId, { name: newName.trim() });
              setConversations(
                conversations.map((c) => (c.id === conversationId ? res.result : c))
              );
            } catch (e: any) {
              Alert.alert(
                t('errors.request_failed'),
                e?.response?.data?.message || t('chat.group_name_change_failed')
              );
            }
          },
        },
      ],
      'plain-text',
      conversation?.name ?? undefined
    );
  };

  const handlePickAvatar = async () => {
    if (!canManage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('errors.request_failed'), t('mobile.settings.photo_permission_body'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        let filename = uri.split('/').pop() || 'avatar.jpg';
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : 'image/jpeg';

        const uploadRes = await fileService.upload(uri, filename, type);
        const fileUrl = uploadRes.url;

        const res = await groupService.updateGroup(conversationId, { avatar: fileUrl });
        setConversations(conversations.map((c) => (c.id === conversationId ? res.result : c)));
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t('errors.request_failed'), t('chat.group_avatar_update_failed'));
    }
  };

  const handleOpenMemberConversation = useCallback(
    async (targetUserId: string) => {
      if (!user) return;

      const existingConversation = conversations.find(
        (item) =>
          item.type === 'PRIVATE' &&
          item.participantIds.includes(targetUserId) &&
          item.participantIds.includes(user.id)
      );

      if (existingConversation) {
        router.push(`/chat/${existingConversation.id}`);
        return;
      }

      const response = await conversationService.create({
        type: 'PRIVATE',
        participantIds: [targetUserId],
      });
      router.push(`/chat/${response.result.id}`);
    },
    [conversations, router, user]
  );

  const handleMemberAction = (member: GroupMemberResponse) => {
    if (member.userId === user?.id) return;

    const options = [];
    if (canManage && member.role !== 'OWNER') {
      options.push({
        text: t('chat.group_panel.remove_from_group'),
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert(
            t('chat.group_panel.remove_member_title'),
            t('mobile.chat.remove_member_confirm', { name: member.displayName }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('chat.group_panel.remove'),
                style: 'destructive',
                onPress: async () => {
                  try {
                    await groupService.removeMember(conversationId, member.userId);
                    setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
                    Alert.alert(
                      t('mobile.common.success'),
                      t('mobile.chat.removed_from_group_success')
                    );
                  } catch (e: unknown) {
                    const msg =
                      e instanceof Error ? e.message : t('chat.group_panel.remove_member_failed');
                    Alert.alert(t('errors.request_failed'), msg);
                  }
                },
              },
            ]
          );
        },
      });
    }

    if (currentUserRole === 'OWNER' && member.role !== 'OWNER') {
      const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
      options.push({
        text:
          newRole === 'ADMIN' ? t('chat.group_panel.make_admin') : t('mobile.chat.dismiss_admin'),
        onPress: async () => {
          try {
            await groupService.updateRole(conversationId, member.userId, {
              role: newRole as GroupRole,
            });
            setMembers((prev) =>
              prev.map((m) =>
                m.userId === member.userId ? { ...m, role: newRole as GroupRole } : m
              )
            );
            Alert.alert(t('mobile.common.success'), t('chat.group_panel.role_updated'));
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('chat.group_panel.role_update_failed');
            Alert.alert(t('errors.request_failed'), msg);
          }
        },
      });
    }

    options.push({ text: t('common.cancel'), style: 'cancel' as const });

    if (options.length > 1) {
      Alert.alert(member.displayName, t('chat.group_panel.manage_member'), options);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(t('chat.leave_group'), t('chat.confirm_leave_group'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chat.leave_group'),
        style: 'destructive',
        onPress: async () => {
          try {
            await groupService.removeMember(conversationId, user?.id || '');
            router.dismissAll();
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('chat.group_leave_failed');
            Alert.alert(t('errors.request_failed'), msg);
          }
        },
      },
    ]);
  };

  const handleDissolveGroup = () => {
    Alert.alert(
      t('chat.group_panel.dissolve_confirm_title'),
      t('chat.group_panel.dissolve_confirm_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.group_panel.dissolve_group'),
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationService.dissolve(conversationId);
              removeConversation(conversationId);
              router.dismissAll();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : t('chat.group_dissolve_failed');
              Alert.alert(t('errors.request_failed'), msg);
            }
          },
        },
      ]
    );
  };

  const handleOpenAddModal = () => {
    fetchContacts();
    setAddModalVisible(true);
  };

  const handleSetNickname = () => {
    Alert.prompt(
      t('chat.set_nickname'),
      t('mobile.chat.nickname_prompt', {
        name: otherUser?.displayName ?? t('mobile.chat.user_fallback'),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.save'),
          onPress: (value?: string) => {
            setNickname(conversationId, (value ?? '').trim());
          },
        },
      ],
      'plain-text',
      nickname
    );
  };

  const handleMutePress = () => {
    setMuteModalVisible(true);
  };

  const handleAddMember = async (contactUser: any) => {
    try {
      setAddingMember(true);
      const res = await groupService.addMember(conversationId, { userId: contactUser.id });
      setMembers((prev) => [...prev, res.result]);
      setAddModalVisible(false);
      Alert.alert(t('mobile.common.success'), t('mobile.chat.member_added_success'));
    } catch (e: any) {
      Alert.alert(
        t('errors.request_failed'),
        e?.response?.data?.message || t('mobile.chat.add_member_failed')
      );
    } finally {
      setAddingMember(false);
    }
  };

  // ── Invite Link ──
  const fetchInviteLink = async () => {
    if (!conversationId) return;
    setInviteLinkLoading(true);
    try {
      const res = await groupService.getOrCreateInviteLink(conversationId);
      if (res.result) setInviteLink(res.result.inviteToken);
    } catch {
      /* silent */
    } finally {
      setInviteLinkLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(buildWebJoinLink(inviteLink));
    Alert.alert(t('common.copied'), t('chat.invite_link_copied'));
  };

  const handleResetInviteLink = async () => {
    if (!conversationId) return;
    try {
      const res = await groupService.resetInviteLink(conversationId);
      if (res.result) setInviteLink(res.result.inviteToken);
      Alert.alert(t('mobile.common.success'), t('mobile.chat.invite_link_regenerated'));
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.invite_link_regenerate_failed'));
    }
  };

  // ── Pending Requests ──
  const fetchPendingRequests = async () => {
    if (!conversationId || !canManage) return;
    try {
      const res = await groupService.getPendingRequests(conversationId);
      setPendingRequests(res.result ?? []);
    } catch {
      /* silent */
    }
  };

  const handleApprovePending = async (userId: string) => {
    try {
      await groupService.approvePendingRequest(conversationId, userId);
      removeByTypeAndReference('GROUP_JOIN_REQUEST', conversationId);
      fetchPendingRequests();
      fetchMembers();
    } catch {
      Alert.alert(t('errors.request_failed'), t('chat.group_panel.request_approve_failed'));
    }
  };

  const handleRejectPending = async (userId: string) => {
    try {
      await groupService.rejectPendingRequest(conversationId, userId);
      removeByTypeAndReference('GROUP_JOIN_REQUEST', conversationId);
      fetchPendingRequests();
    } catch {
      Alert.alert(t('errors.request_failed'), t('chat.group_panel.request_reject_failed'));
    }
  };

  // ── Require approval toggle ──
  const handleToggleRequireApproval = async (val: boolean) => {
    setRequireApproval(val);
    try {
      await groupService.updateGroup(conversationId, { requireApproval: val });
    } catch {
      setRequireApproval(!val);
      Alert.alert(t('errors.request_failed'), t('chat.group_panel.update_failed'));
    }
  };

  // ── AI proactive toggle ──
  const handleToggleAiProactive = async (val: boolean) => {
    setAiProactiveEnabled(val);
    try {
      await groupService.updateGroup(conversationId, { aiProactiveEnabled: val });
    } catch {
      setAiProactiveEnabled(!val);
      Alert.alert(t('errors.request_failed'), t('chat.group_panel.update_failed'));
    }
  };

  // ── Reminders ──
  const fetchReminders = async () => {
    if (!conversationId) return;
    try {
      const res = await groupService.getReminders(conversationId);
      setReminders(res.result ?? []);
    } catch {
      /* silent */
    }
  };

  const handleCreateReminder = () => {
    Alert.prompt(
      t('chat.reminders_dialog.create_new'),
      t('mobile.chat.create_reminder_prompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.reminders_dialog.create'),
          onPress: async (title?: string) => {
            if (!title?.trim()) return;
            try {
              await groupService.createReminder(conversationId, { title: title.trim() });
              fetchReminders();
            } catch {
              Alert.alert(t('errors.request_failed'), t('chat.reminders_dialog.create_failed'));
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleToggleReminder = async (id: string) => {
    try {
      await groupService.toggleReminder(id);
      fetchReminders();
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.update_failed_short'));
    }
  };

  const handleDeleteReminder = (id: string) => {
    Alert.alert(t('mobile.chat.delete_reminder_title'), t('mobile.chat.delete_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await groupService.deleteReminder(id);
            fetchReminders();
          } catch {
            Alert.alert(t('errors.request_failed'), t('mobile.chat.delete_failed_short'));
          }
        },
      },
    ]);
  };

  // ── Notes ──
  const fetchNotes = async () => {
    if (!conversationId) return;
    try {
      const res = await groupService.getNotes(conversationId);
      setNotes(res.result ?? []);
    } catch {
      /* silent */
    }
  };

  const handleCreateNote = () => {
    Alert.prompt(
      t('mobile.chat.create_note_title'),
      t('mobile.chat.enter_note_title'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.reminders_dialog.create'),
          onPress: async (title?: string) => {
            if (!title?.trim()) return;
            try {
              await groupService.createNote(conversationId, { title: title.trim() });
              fetchNotes();
            } catch {
              Alert.alert(t('errors.request_failed'), t('mobile.chat.note_create_failed'));
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    try {
      await groupService.updateNote(noteId, { title: '', pinned: !currentPinned });
      fetchNotes();
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.note_pin_update_failed'));
    }
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert(t('mobile.chat.note_delete_title'), t('mobile.chat.delete_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await groupService.deleteNote(id);
            fetchNotes();
          } catch {
            Alert.alert(t('errors.request_failed'), t('mobile.chat.delete_failed_short'));
          }
        },
      },
    ]);
  };

  // Fetch invite link + pending on mount for groups
  useEffect(() => {
    if (isGroup) {
      fetchInviteLink();
      if (currentUserRole === 'OWNER') fetchPendingRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroup, currentUserRole]);

  const availableContacts = useMemo(() => {
    return contacts.filter((c) => {
      const contactUser = c.user.id === user?.id ? c.contact : c.user;
      const isMember = members.some((m) => m.userId === contactUser.id);
      if (isMember) return false;
      if (!searchQuery.trim()) return true;
      return contactUser.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [contacts, members, user?.id, searchQuery]);

  // ── Quick action button helper ──
  const QuickActionBtn = ({
    iconName,
    label,
    onPress,
    active = false,
  }: {
    iconName: string;
    label: string;
    onPress: () => void;
    active?: boolean;
  }) => (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', flex: 1, maxWidth: 76 }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: active ? Colors.ctaLight : Colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {(() => {
          const key = (iconName || '').toString().toLowerCase();
          const iconSize =
            key.includes('pin') || key.includes('bookmark') || key.includes('notification')
              ? 24
              : 22;
          return (
            <Ionicons
              name={iconName as any}
              size={iconSize}
              color={active ? Colors.cta : Colors.text}
            />
          );
        })()}
      </View>
      <Text
        style={{
          color: Colors.textMuted,
          fontSize: 11,
          textAlign: 'center',
          marginTop: 6,
          lineHeight: 15,
        }}
        numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.text,
            }}>
            {t('chat.options')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 16) }}
        keyboardShouldPersistTaps="handled">
        {/* ── Profile card ── */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 28,
            paddingBottom: 20,
            backgroundColor: Colors.bgCard,
            marginBottom: 8,
          }}>
          <TouchableOpacity
            onPress={isGroup && canManage ? handlePickAvatar : undefined}
            disabled={!isGroup || !canManage}>
            <View style={{ position: 'relative' }}>
              <Avatar
                uri={isGroup ? (conversation?.avatarUrl ?? null) : (otherUser?.avatarUrl ?? null)}
                name={
                  isGroup
                    ? (conversation?.name ?? t('chat.group_chat_short'))
                    : (otherUser?.displayName ?? '?')
                }
                size={80}
              />
              {isGroup && canManage && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    borderRadius: 99,
                    padding: 5,
                    backgroundColor: Colors.cta,
                  }}>
                  <Ionicons name="camera" size={12} color={Colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 24,
            }}
            onPress={isGroup && canManage ? handleChangeName : undefined}
            disabled={!isGroup || !canManage}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: Colors.text,
                flexShrink: 1,
                textAlign: 'center',
              }}>
              {isGroup
                ? (conversation?.name ?? t('chat.fallback_group_name'))
                : (otherUser?.displayName ?? '...')}
            </Text>
            {isGroup && canManage && (
              <Ionicons
                name="pencil"
                size={15}
                color={Colors.textLight}
                style={{ marginLeft: 6 }}
              />
            )}
          </TouchableOpacity>
          {!isGroup && otherUser && (
            <>
              {nickname ? (
                <Text style={{ marginTop: 2, fontSize: 14, fontWeight: '600', color: Colors.cta }}>
                  {nickname}
                </Text>
              ) : null}
              <Text style={{ marginTop: nickname ? 1 : 2, fontSize: 13, color: Colors.textMuted }}>
                @{otherUser.username}
              </Text>
            </>
          )}
          {isGroup && (
            <Text style={{ marginTop: 4, color: Colors.textLight }}>
              {t('chat.members_count', { count: members.length })}
            </Text>
          )}

          {/* ── Quick action buttons ── */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: 24,
              paddingHorizontal: 8,
              alignSelf: 'stretch',
              justifyContent: 'center',
              gap: 4,
            }}>
            <QuickActionBtn
              iconName="search-outline"
              label={t('chat.search_messages')}
              onPress={() => router.back()}
            />
            {isGroup ? (
              <QuickActionBtn
                iconName="person-add-outline"
                label={t('chat.add_member')}
                onPress={handleOpenAddModal}
              />
            ) : (
              <QuickActionBtn
                iconName="person-outline"
                label={t('mobile.chat.user_profile_action')}
                onPress={() => {
                  if (otherUser?.id) {
                    router.push(`/profile/${otherUser.id}`);
                  }
                }}
              />
            )}
            <QuickActionBtn
              iconName={isPinned ? 'bookmark' : 'bookmark-outline'}
              label={isPinned ? t('chat.unpin_label') : t('chat.pin_conversation_label')}
              onPress={() => setPin(conversationId, !isPinned)}
              active={isPinned}
            />
            <QuickActionBtn
              iconName={isEffMuted ? 'notifications-off-outline' : 'notifications-outline'}
              label={isEffMuted ? t('mobile.chat.unmute_short') : t('mobile.chat.mute_short')}
              onPress={handleMutePress}
              active={isEffMuted}
            />
          </View>
        </View>

        {/* ── DM settings rows ── */}
        {!isGroup && (
          <View style={{ backgroundColor: Colors.bgCard, marginBottom: 8 }}>
            <TouchableOpacity
              onPress={handleSetNickname}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 54,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Ionicons
                name="pencil-outline"
                size={20}
                color={Colors.textMuted}
                style={{ marginRight: 14 }}
              />
              <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>
                {t('chat.set_nickname')}
              </Text>
              {nickname ? (
                <Text
                  style={{ fontSize: 13, color: Colors.textLight, maxWidth: 140 }}
                  numberOfLines={1}>
                  {nickname}
                </Text>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Media (Ảnh, file, link) ── */}
        <View style={{ backgroundColor: Colors.bgCard, marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => router.push(`/chat/${conversationId}/shared-media`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              height: 54,
            }}>
            <Ionicons
              name="images-outline"
              size={20}
              color={Colors.textMuted}
              style={{ marginRight: 14 }}
            />
            <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>
              {t('mobile.chat.media_files_links')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {mediaFiles.length > 0 && (
          <View style={{ backgroundColor: Colors.bgCard, padding: 16, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: Colors.text }}>
                {t('mobile.chat.media_section_count', { count: mediaFiles.length })}
              </Text>
              <TouchableOpacity
                onPress={() => router.push(`/chat/${conversationId}/shared-media?tab=media`)}>
                <Text style={{ fontSize: 13, color: Colors.cta }}>{t('common.view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ImageLightbox
              images={mediaImageUrls}
              initialIndex={lightboxIndex}
              visible={lightboxVisible}
              onClose={() => setLightboxVisible(false)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {mediaFiles.slice(0, 4).map((file, idx) => (
                  <TouchableOpacity
                    key={file.fileId}
                    onPress={() => openMediaLightbox(idx)}
                    style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Image
                      source={{ uri: file.url }}
                      style={{ width: 80, height: 80 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
                {mediaFiles.length > 4 && (
                  <TouchableOpacity
                    onPress={() => router.push(`/chat/${conversationId}/shared-media?tab=media`)}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      backgroundColor: Colors.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="arrow-forward" size={22} color={Colors.cta} />
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Files ── */}
        {docFiles.length > 0 && (
          <View style={{ backgroundColor: Colors.bgCard, padding: 16, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: Colors.text }}>
                {t('mobile.chat.files_section_count', { count: docFiles.length })}
              </Text>
              <TouchableOpacity
                onPress={() => router.push(`/chat/${conversationId}/shared-media?tab=files`)}>
                <Text style={{ fontSize: 13, color: Colors.cta }}>{t('common.view_all')}</Text>
              </TouchableOpacity>
            </View>
            {docFiles.slice(0, 5).map((file) => {
              const sizeStr = file.fileSize
                ? file.fileSize > 1048576
                  ? `${(file.fileSize / 1048576).toFixed(1)} MB`
                  : `${(file.fileSize / 1024).toFixed(0)} KB`
                : '';
              return (
                <TouchableOpacity
                  key={file.fileId}
                  onPress={() => Linking.openURL(file.url)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: Colors.borderLight,
                  }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: Colors.ctaLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}>
                    <Ionicons name="document-text" size={18} color={Colors.cta} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 13, fontWeight: '500', color: Colors.text }}>
                      {file.fileName}
                    </Text>
                    {sizeStr ? (
                      <Text style={{ fontSize: 11, color: Colors.textLight }}>{sizeStr}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="download-outline" size={18} color={Colors.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Group: Members ── */}
        {isGroup && (
          <View style={{ backgroundColor: Colors.bgCard, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: Colors.text }}>
                {t('chat.members_label', { count: members.length })}
              </Text>
              {canManage && (
                <TouchableOpacity
                  onPress={handleOpenAddModal}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: Colors.ctaLight,
                  }}>
                  <Ionicons name="person-add" size={14} color={Colors.cta} />
                  <Text
                    style={{ marginLeft: 4, color: Colors.cta, fontSize: 13, fontWeight: '600' }}>
                    {t('common.add')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {loading && <ActivityIndicator style={{ padding: 16 }} color={Colors.cta} />}
            {members.map((item) => (
              <TouchableOpacity
                key={item.userId}
                onPress={() => handleMemberAction(item)}
                disabled={item.userId === user?.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderTopWidth: 0.5,
                  borderTopColor: Colors.borderLight,
                }}>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    setQuickProfileMember(item);
                  }}
                  activeOpacity={0.8}>
                  <Avatar uri={item.avatar} name={item.displayName} size={40} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '500', color: Colors.text }}>
                    {item.userId === user?.id ? t('common.you') : item.displayName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 12, marginTop: 1, color: Colors.textLight }}>
                    @{item.username}
                  </Text>
                </View>
                {item.role !== 'MEMBER' && (
                  <View
                    style={{
                      borderRadius: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: item.role === 'OWNER' ? '#FFE8D6' : Colors.ctaLight,
                    }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: item.role === 'OWNER' ? '#D08C60' : Colors.cta,
                      }}>
                      {item.role === 'OWNER'
                        ? t('chat.group_panel.owner')
                        : t('chat.group_panel.admin')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        {/* ── Group: Invite Link + Settings ── */}
        {isGroup && (
          <View style={{ backgroundColor: Colors.bgCard, marginBottom: 8 }}>
            {/* Invite Link */}
            <TouchableOpacity
              onPress={inviteLink ? handleCopyInviteLink : fetchInviteLink}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 54,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Ionicons
                name="link-outline"
                size={22}
                color={Colors.textMuted}
                style={{ marginRight: 14 }}
              />
              <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>
                {inviteLink
                  ? t('mobile.chat.copy_invite_link')
                  : t('chat.group_panel.create_invite_link')}
              </Text>
              {inviteLinkLoading ? (
                <ActivityIndicator size="small" color={Colors.cta} />
              ) : (
                <Ionicons
                  name={inviteLink ? 'copy-outline' : 'chevron-forward'}
                  size={16}
                  color={Colors.textLight}
                />
              )}
            </TouchableOpacity>

            {/* Reset invite link (OWNER/ADMIN only) */}
            {inviteLink && canManage && (
              <TouchableOpacity
                onPress={handleResetInviteLink}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  height: 48,
                  borderBottomWidth: 0.5,
                  borderBottomColor: Colors.borderLight,
                }}>
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={Colors.cta}
                  style={{ marginRight: 14 }}
                />
                <Text style={{ fontSize: 14, color: Colors.cta }}>{t('chat.reset_link')}</Text>
              </TouchableOpacity>
            )}

            {/* Require approval toggle (OWNER/ADMIN) */}
            {canManage && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  height: 54,
                  borderBottomWidth: 0.5,
                  borderBottomColor: Colors.borderLight,
                }}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={Colors.textMuted}
                  style={{ marginRight: 14 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: Colors.text }}>
                    {t('chat.group_panel.approve_new_members')}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 1 }}>
                    {t('mobile.chat.approve_join_hint')}
                  </Text>
                </View>
                <Switch
                  value={requireApproval}
                  onValueChange={handleToggleRequireApproval}
                  trackColor={{ false: Colors.borderLight, true: Colors.cta }}
                  thumbColor={Colors.white}
                />
              </View>
            )}

            {/* AI proactive toggle (OWNER/ADMIN) */}
            {canManage && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  height: 54,
                  borderBottomWidth: 0.5,
                  borderBottomColor: Colors.borderLight,
                }}>
                <View style={{ marginRight: 14 }}>
                  <CustomAiIcon size={22} color={Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: Colors.text }}>{t('chat.ai_short')}</Text>
                  <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 1 }}>
                    {t('chat.group_panel.ai_proactive_desc')}
                  </Text>
                </View>
                <Switch
                  value={aiProactiveEnabled}
                  onValueChange={handleToggleAiProactive}
                  trackColor={{ false: Colors.borderLight, true: Colors.cta }}
                  thumbColor={Colors.white}
                />
              </View>
            )}
          </View>
        )}

        {/* ── Group: Pending Requests (OWNER only) ── */}
        {isGroup && currentUserRole === 'OWNER' && pendingRequests.length > 0 && (
          <View style={{ backgroundColor: Colors.bgCard, marginBottom: 8 }}>
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: Colors.text }}>
                {t('chat.group_panel.pending_requests', { count: pendingRequests.length })}
              </Text>
            </View>
            {pendingRequests.map((req) => (
              <View
                key={req.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderBottomWidth: 0.5,
                  borderBottomColor: Colors.borderLight,
                }}>
                <Avatar uri={req.avatarUrl} name={req.displayName} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '500', color: Colors.text }}>
                    {req.displayName}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: Colors.textLight }}>
                    @{req.username}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleApprovePending(req.userId)}
                  style={{
                    marginRight: 8,
                    padding: 6,
                    borderRadius: 8,
                    backgroundColor: '#E8F5E9',
                  }}>
                  <Ionicons name="checkmark" size={18} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRejectPending(req.userId)}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: '#FFEBEE' }}>
                  <Ionicons name="close" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Group: Bulletin Board (Reminders + Notes) ── */}
        {isGroup && (
          <View style={{ backgroundColor: Colors.bgCard, marginBottom: 8 }}>
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: Colors.text }}>
                {t('chat.group_bulletin_board')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                fetchReminders();
                setRemindersVisible(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 54,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Ionicons
                name="alarm-outline"
                size={22}
                color={Colors.textMuted}
                style={{ marginRight: 14 }}
              />
              <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>
                {t('chat.reminders_dialog.title')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                fetchNotes();
                setNotesVisible(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 54,
              }}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={Colors.textMuted}
                style={{ marginRight: 14 }}
              />
              <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>{t('chat.notes')}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Settings: Pin & Mute ── */}
        <View style={{ backgroundColor: Colors.bgCard, marginBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              height: 54,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors.borderLight,
            }}>
            <Ionicons
              name="pin-outline"
              size={22}
              color={Colors.textMuted}
              style={{ marginRight: 14 }}
            />
            <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>
              {t('chat.pin_conversation')}
            </Text>
            <Switch
              value={isPinned}
              onValueChange={(v) => setPin(conversationId, v)}
              trackColor={{ false: Colors.borderLight, true: Colors.cta }}
              thumbColor={Colors.white}
            />
          </View>
          <TouchableOpacity
            onPress={handleMutePress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              minHeight: 54,
              paddingVertical: 8,
            }}>
            <Ionicons
              name={isEffMuted ? 'notifications-off-outline' : 'notifications-outline'}
              size={22}
              color={isEffMuted ? Colors.cta : Colors.textMuted}
              style={{ marginRight: 14 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: Colors.text }}>
                {t('chat.silence_notifications')}
              </Text>
              {isEffMuted && (
                <Text style={{ fontSize: 12, color: Colors.cta, marginTop: 1 }}>
                  {muteUntilLabel}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── Dissolve group (owner only) ── */}
        {isGroup && currentUserRole === 'OWNER' && (
          <TouchableOpacity
            onPress={handleDissolveGroup}
            style={{
              backgroundColor: Colors.bgCard,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 4,
            }}>
            <Text style={{ color: Colors.error, fontSize: 16, fontWeight: '600' }}>
              {t('chat.group_panel.dissolve_group')}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Leave group ── */}
        {isGroup && (
          <TouchableOpacity
            onPress={handleLeaveGroup}
            style={{
              backgroundColor: Colors.bgCard,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 8,
            }}>
            <Text style={{ color: Colors.error, fontSize: 16, fontWeight: '600' }}>
              {t('chat.leave_group')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddModalVisible(false)}>
        <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
          <View
            className="flex-row items-center justify-between px-4"
            style={{
              height: 60,
              backgroundColor: Colors.bgCard,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors.borderLight,
            }}>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={{ color: Colors.text, fontSize: 16 }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {t('chat.add_members_dialog.title')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View className="p-3" style={{ backgroundColor: Colors.bgCard }}>
            <TextInput
              placeholder={t('common.search')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                backgroundColor: Colors.bg,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                fontSize: 15,
              }}
            />
          </View>
          <FlatList
            data={availableContacts}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={() => (
              <View className="items-center p-4">
                <Text style={{ color: Colors.textLight }}>{t('contact.no_results')}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const contactUser = item.user.id === user?.id ? item.contact : item.user;
              return (
                <TouchableOpacity
                  onPress={() => handleAddMember(contactUser)}
                  disabled={addingMember}
                  className="flex-row items-center px-4 py-3"
                  style={{
                    backgroundColor: Colors.bgCard,
                    borderBottomWidth: 0.5,
                    borderBottomColor: Colors.borderLight,
                  }}>
                  <Avatar uri={contactUser.avatarUrl} name={contactUser.displayName} size={40} />
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold" style={{ color: Colors.text }}>
                      {contactUser.displayName}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={Colors.cta} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Mute Duration Picker Modal */}
      <Modal
        visible={muteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMuteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: Colors.bgCard,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: insets.bottom,
            }}>
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: Colors.text,
                  textAlign: 'center',
                }}>
                {isEffMuted
                  ? t('mobile.chat.muted_status')
                  : t('mobile.chat.mute_notifications_title')}
              </Text>
              {isEffMuted && (
                <Text
                  style={{
                    fontSize: 13,
                    color: Colors.textMuted,
                    textAlign: 'center',
                    marginTop: 4,
                  }}>
                  {muteUntilLabel}
                </Text>
              )}
            </View>

            {/* Options */}
            <View style={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}>
              {isEffMuted ? (
                <TouchableOpacity
                  onPress={() => {
                    setMute(conversationId, false);
                    setMuteModalVisible(false);
                  }}
                  style={{
                    backgroundColor: Colors.error,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.white }}>
                    {t('mobile.chat.unmute_now')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  {[
                    { labelKey: 'chat.mute_1h', hours: 1 },
                    { labelKey: 'chat.mute_4h', hours: 4 },
                    { labelKey: 'chat.mute_8h', hours: 8 },
                    { labelKey: 'chat.mute_forever', hours: -1 },
                  ].map(({ labelKey, hours }) => (
                    <TouchableOpacity
                      key={labelKey}
                      onPress={() => {
                        const h = (hrs: number) => Date.now() + hrs * 3_600_000;
                        setMute(conversationId, true, hours === -1 ? null : h(hours));
                        setMuteModalVisible(false);
                      }}
                      style={{
                        backgroundColor: Colors.ctaLight,
                        borderRadius: 10,
                        paddingVertical: 12,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: Colors.cta,
                      }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.cta }}>
                        {t(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              <TouchableOpacity
                onPress={() => setMuteModalVisible(false)}
                style={{
                  backgroundColor: Colors.bg,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.text }}>
                  {t('common.close')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reminders Modal */}
      <Modal
        visible={remindersVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRemindersVisible(false)}>
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              height: 60,
              backgroundColor: Colors.bgCard,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors.borderLight,
            }}>
            <TouchableOpacity onPress={() => setRemindersVisible(false)}>
              <Text style={{ color: Colors.text, fontSize: 16 }}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.text }}>
              {t('chat.reminders')}
            </Text>
            <TouchableOpacity onPress={handleCreateReminder}>
              <Ionicons name="add" size={24} color={Colors.cta} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="alarm-outline" size={40} color={Colors.borderLight} />
                <Text style={{ color: Colors.textLight, marginTop: 8 }}>
                  {t('chat.reminders_dialog.empty')}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isCompleted = item.completed;
              const timeStr = item.remindAt
                ? (() => {
                    const d = new Date(item.remindAt);
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mo = String(d.getMonth() + 1).padStart(2, '0');
                    return `${hh}:${mm} - ${dd}/${mo}`;
                  })()
                : null;

              return (
                <View
                  style={{
                    backgroundColor: Colors.bgCard,
                    borderRadius: 12,
                    marginBottom: 10,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: Colors.borderLight,
                    opacity: isCompleted ? 0.7 : 1,
                  }}>
                  {/* Header bar */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      backgroundColor: isCompleted ? '#f0fdf4' : `${Colors.cta}10`,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.borderLight,
                      gap: 6,
                    }}>
                    <TouchableOpacity onPress={() => handleToggleReminder(item.id)}>
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={isCompleted ? '#16a34a' : Colors.cta}
                      />
                    </TouchableOpacity>
                    <Ionicons
                      name="alarm-outline"
                      size={13}
                      color={isCompleted ? '#16a34a' : Colors.cta}
                    />
                    {timeStr ? (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: isCompleted ? '#16a34a' : Colors.cta,
                          flex: 1,
                        }}>
                        {timeStr}
                      </Text>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteReminder(item.id)}
                      style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  {/* Body */}
                  <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: Colors.text,
                        textDecorationLine: isCompleted ? 'line-through' : 'none',
                      }}>
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: Colors.textMuted,
                          marginTop: 4,
                          lineHeight: 17,
                        }}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal
        visible={notesVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotesVisible(false)}>
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              height: 60,
              backgroundColor: Colors.bgCard,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors.borderLight,
            }}>
            <TouchableOpacity onPress={() => setNotesVisible(false)}>
              <Text style={{ color: Colors.text, fontSize: 16 }}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.text }}>
              {t('chat.notes')}
            </Text>
            <TouchableOpacity onPress={handleCreateNote}>
              <Ionicons name="add" size={24} color={Colors.cta} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="document-text-outline" size={40} color={Colors.borderLight} />
                <Text style={{ color: Colors.textLight, marginTop: 8 }}>
                  {t('mobile.chat.no_items_yet', { label: t('chat.notes').toLowerCase() })}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: Colors.bgCard,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 8,
                  borderLeftWidth: item.pinned ? 3 : 0,
                  borderLeftColor: Colors.cta,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  {item.pinned && (
                    <Ionicons name="pin" size={14} color={Colors.cta} style={{ marginRight: 4 }} />
                  )}
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text }}>
                    {item.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleTogglePin(item.id, item.pinned)}
                    style={{ padding: 4, marginRight: 4 }}>
                    <Ionicons
                      name={item.pinned ? 'pin' : 'pin-outline'}
                      size={16}
                      color={item.pinned ? Colors.cta : Colors.textLight}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteNote(item.id)}
                    style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                {item.content ? (
                  <Text
                    style={{ fontSize: 14, color: Colors.textMuted, lineHeight: 20 }}
                    numberOfLines={4}>
                    {item.content}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 6 }}>
                  {new Date(item.createdAt).toLocaleString('en-US')}
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>

      <UserQuickProfileDialog
        visible={Boolean(quickProfileMember)}
        userId={quickProfileMember?.userId ?? null}
        fallbackDisplayName={quickProfileMember?.displayName}
        fallbackAvatarUrl={quickProfileMember?.avatar ?? undefined}
        onClose={() => setQuickProfileMember(null)}
        onMessage={handleOpenMemberConversation}
      />
    </View>
  );
}

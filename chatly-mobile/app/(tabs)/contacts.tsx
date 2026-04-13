import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  Animated,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { usePresenceSocket, type PresenceEvent } from '@/hooks/usePresenceSocket';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contactService } from '@/services/contact.service';
import { userService } from '@/services/user.service';
import { conversationService } from '@/services/conversation.service';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { useContactStore } from '@/store/contact.store';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import type { ContactResponse } from '@/types/contact';
import type { UserResponse } from '@/types/auth';

type Tab = 'friends' | 'pending' | 'blocked' | 'search';

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const conversations = useConversationStore((s) => s.conversations);
  const router = useRouter();
  const invalidateContacts = useContactStore((s) => s.invalidate);

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [pendingContacts, setPendingContacts] = useState<ContactResponse[]>([]);
  const [blockedContacts, setBlockedContacts] = useState<ContactResponse[]>([]);
  const [searchResults, setSearchResults] = useState<UserResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Friends tab — local filter state
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online'>('all');
  const [onlineUserIds, setOnlineUserIds] = useState<Record<string, 'ONLINE' | 'OFFLINE'>>({});
  const [menuContact, setMenuContact] = useState<ContactResponse | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const openMenu = useCallback((contact: ContactResponse) => {
    setMenuContact(contact);
    setSheetVisible(true);
    overlayOpacity.setValue(0);
    sheetTranslateY.setValue(300);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [overlayOpacity, sheetTranslateY]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 300, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setMenuContact(null);
      setSheetVisible(false);
    });
  }, [overlayOpacity, sheetTranslateY]);

  usePresenceSocket({
    onPresenceChange: useCallback((event: PresenceEvent) => {
      setOnlineUserIds((prev) => ({ ...prev, [event.userId]: event.status }));
    }, []),
  });

  // Fetch accepted contacts
  const fetchContacts = useCallback(async () => {
    try {
      const res = await contactService.getByStatus('ACCEPTED');
      setContacts(res.result);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  }, []);

  // Fetch pending requests
  const fetchPending = useCallback(async () => {
    try {
      const res = await contactService.getByStatus('PENDING');
      setPendingContacts(res.result);
    } catch (error) {
      console.error('Failed to fetch pending:', error);
    }
  }, []);

  // Fetch blocked contacts
  const fetchBlocked = useCallback(async () => {
    try {
      const res = await contactService.getByStatus('BLOCKED');
      setBlockedContacts(res.result);
    } catch (error) {
      console.error('Failed to fetch blocked:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContacts(), fetchPending(), fetchBlocked()]).finally(() => setLoading(false));
  }, [fetchContacts, fetchPending, fetchBlocked]);

  // Reset friends filters on tab change
  useEffect(() => {
    setFriendSearchQuery('');
    setOnlineFilter('all');
  }, [activeTab]);

  // Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchContacts(), fetchPending(), fetchBlocked()]);
    setRefreshing(false);
  };

  // Search users
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await userService.search(searchQuery.trim());
      // Filter out self
      const filtered = res.result.items?.filter((u) => u.id !== user?.id) ?? [];
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [searchQuery, user?.id]);

  useEffect(() => {
    if (activeTab === 'search') {
      const timer = setTimeout(handleSearch, 400);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab, handleSearch]);

  // Accept contact request
  const handleAccept = async (contactId: string) => {
    try {
      await contactService.accept(contactId);
      fetchContacts();
      fetchPending();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message ?? 'Could not accept invitation.');
    }
  };

  // Decline contact request
  const handleDecline = async (contactId: string) => {
    try {
      await contactService.delete(contactId);
      fetchPending();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message ?? 'Could not decline invitation.');
    }
  };

  // Unblock contact
  const handleUnblock = async (contactId: string, displayName: string) => {
    Alert.alert(
      'Unblock user?',
      `${displayName} will be able to message you and send friend requests again. Your friendship will be restored.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await contactService.unblock(contactId);
              fetchContacts();
              fetchBlocked();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message ?? 'Could not unblock.');
            }
          },
        },
      ],
    );
  };

  // Block a friend
  const handleBlock = async (contact: ContactResponse, displayName: string) => {
    const contactUser = getContactUser(contact);
    Alert.alert(
      'Block user?',
      `${displayName} will no longer be able to message you or view your full profile. Your friendship will be frozen.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.blockByUser(contactUser.id);
              invalidateContacts();
              fetchContacts();
              fetchBlocked();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message ?? 'Could not block user.');
            }
          },
        },
      ],
    );
  };

  // Remove a friend
  const handleRemove = async (contactId: string, displayName: string) => {
    Alert.alert(
      'Remove friend?',
      `Are you sure you want to remove ${displayName} from your friends? You'll need to send a new request to reconnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.delete(contactId);
              fetchContacts();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message ?? 'Could not remove friend.');
            }
          },
        },
      ],
    );
  };

  // Send contact request
  const handleSendRequest = async (contactUserId: string) => {
    // Check if already a contact
    const allContacts = [...contacts, ...pendingContacts, ...blockedContacts];
    const existing = allContacts.find(
      (c) => c.contact.id === contactUserId || c.user.id === contactUserId,
    );
    if (existing) {
      const status = existing.status;
      if (status === 'ACCEPTED') {
        Alert.alert('Info', 'You are already friends with this user.');
        return;
      }
      if (status === 'PENDING') {
        Alert.alert('Info', 'A friend request is already pending.');
        return;
      }
    }
    try {
      await contactService.sendRequest({ contactId: contactUserId });
      Alert.alert('Success', 'Friend request sent');
      fetchPending();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? '';
      if (msg.includes('ALREADY') || error?.response?.status === 409) {
        Alert.alert('Info', 'A friend request already exists.');
        fetchPending();
      } else {
        Alert.alert('Error', msg || 'Could not send friend request.');
      }
    }
  };

  // Chat with contact — navigate to existing conversation if one exists
  const handleChat = async (contactUser: { id: string }) => {
    // First look for an existing PRIVATE conversation with this user
    const existing = conversations.find(
      (c) =>
        c.type === 'PRIVATE' &&
        c.participantIds.includes(contactUser.id) &&
        c.participantIds.includes(user!.id),
    );
    if (existing) {
      router.push(`/chat/${existing.id}`);
      return;
    }
    try {
      const res = await conversationService.create({
        type: 'PRIVATE',
        participantIds: [contactUser.id],
      });
      router.push(`/chat/${res.result.id}`);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message ?? 'Could not create conversation.');
    }
  };

  // Unfriend contact
  const handleUnfriend = (contactId: string, displayName: string) => {
    Alert.alert(
      'Unfriend',
      `Are you sure you want to unfriend ${displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfriend',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.delete(contactId);
              fetchContacts();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message ?? 'Could not unfriend.');
            }
          },
        },
      ],
    );
  };

  // Get the other user from a contact record
  const getContactUser = (contact: ContactResponse) => {
    return contact.user.id === user?.id ? contact.contact : contact.user;
  };

  const friendSections = useMemo(() => {
    const query = friendSearchQuery.trim().toLowerCase();
    const filtered = contacts.filter((c) => {
      const cu = getContactUser(c);
      if (query && !cu.displayName.toLowerCase().includes(query) && !cu.username.toLowerCase().includes(query)) return false;
      if (onlineFilter === 'online' && onlineUserIds[cu.id] !== 'ONLINE') return false;
      return true;
    });
    const grouped: Record<string, ContactResponse[]> = {};
    [...filtered]
      .sort((a, b) =>
        getContactUser(a).displayName.localeCompare(getContactUser(b).displayName, 'vi'),
      )
      .forEach((contact) => {
        const letter = getContactUser(contact).displayName.charAt(0).toUpperCase();
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push(contact);
      });
    return Object.keys(grouped)
      .sort()
      .map((sectionTitle) => ({ title: sectionTitle, data: grouped[sectionTitle] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, user, friendSearchQuery, onlineFilter, onlineUserIds]);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'pending', label: 'Pending', badge: pendingContacts.length },
    { key: 'blocked', label: 'Blocked' },
    { key: 'search', label: 'Search' },
  ];

  const renderContactItem = ({ item }: { item: ContactResponse }) => {
    const contactUser = getContactUser(item);
    const isOnline = onlineUserIds[contactUser.id] === 'ONLINE';
    const isLimited = item.status === 'BLOCKED'; // backend only returns BLOCKED_ME in friends list

    return (
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
      >
        {/* Avatar with online indicator */}
        <View>
          <Avatar uri={contactUser.avatarUrl} name={contactUser.displayName} size={48} />
          {isOnline && !isLimited && (
            <View
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: Colors.online,
                borderWidth: 2,
                borderColor: Colors.white,
              }}
            />
          )}
        </View>

        <View className="ml-3 flex-1">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text className="text-[16px] font-semibold" style={{ color: Colors.text }}>
              {contactUser.displayName}
            </Text>
            {isLimited && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 99,
                  backgroundColor: '#FFF8E1',
                }}
              >
                <Ionicons name="shield-outline" size={10} color="#B08800" />
                <Text style={{ fontSize: 11, color: '#B08800', fontWeight: '600' }}>Limited</Text>
              </View>
            )}
          </View>
          <Text className="mt-0.5 text-[13px]" style={{ color: isOnline && !isLimited ? Colors.online : Colors.textLight }}>
            {isOnline && !isLimited ? 'Online' : `@${contactUser.username}`}
          </Text>
        </View>

        {/* Action buttons — only for non-limited contacts */}
        <View className="flex-row items-center">
          {!isLimited && (
            <TouchableOpacity
              onPress={() => handleChat(contactUser)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-2"
            >
              <Ionicons name="chatbubble-outline" size={21} color={Colors.cta} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => openMenu(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-2"
          >
            <Ionicons name="ellipsis-vertical" size={19} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPendingItem = ({ item }: { item: ContactResponse }) => {
    const contactUser = getContactUser(item);
    const isReceived = item.contact.id === user?.id;
    return (
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
      >
        <Avatar uri={contactUser.avatarUrl} name={contactUser.displayName} size={48} />
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-semibold" style={{ color: Colors.text }}>
            {contactUser.displayName}
          </Text>
          <Text className="mt-0.5 text-[13px]" style={{ color: Colors.textLight }}>
            {isReceived ? 'wants to connect' : 'Request sent'}
          </Text>
        </View>
        {isReceived && (
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              className="rounded-full px-4 py-1.5 mr-2"
              style={{ backgroundColor: Colors.error }}
              onPress={() => handleDecline(item.id)}
            >
              <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
                Decline
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-full px-4 py-1.5"
              style={{ backgroundColor: Colors.cta }}
              onPress={() => handleAccept(item.id)}
            >
              <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
                Accept
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderBlockedItem = ({ item }: { item: ContactResponse }) => {
    const contactUser = getContactUser(item);
    return (
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
      >
        <Avatar uri={contactUser.avatarUrl} name={contactUser.displayName} size={48} />
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-semibold" style={{ color: Colors.text }}>
            {contactUser.displayName}
          </Text>
          <Text className="mt-0.5 text-[13px]" style={{ color: Colors.textLight }}>
            @{contactUser.username}
          </Text>
        </View>
        <TouchableOpacity
          className="rounded-full px-4 py-1.5"
          style={{ backgroundColor: Colors.textLight }}
          onPress={() => handleUnblock(item.id, contactUser.displayName)}
        >
          <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
            Unblock
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchItem = ({ item }: { item: UserResponse }) => {
    // Check existing contact status
    const allContacts = [...contacts, ...pendingContacts, ...blockedContacts];
    const existing = allContacts.find(
      (c) => c.contact.id === item.id || c.user.id === item.id,
    );
    const status = existing?.status;

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
        onPress={() => router.push(`/profile/${item.id}`)}
        activeOpacity={0.7}
      >
        <Avatar uri={item.avatarUrl} name={item.displayName} size={48} />
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-semibold" style={{ color: Colors.text }}>
            {item.displayName}
          </Text>
          <Text className="mt-0.5 text-[13px]" style={{ color: Colors.textLight }}>
            @{item.username}
          </Text>
        </View>
        {status === 'ACCEPTED' ? (
          <View className="rounded-full px-4 py-1.5" style={{ backgroundColor: Colors.borderLight }}>
            <Text className="text-[14px] font-semibold" style={{ color: Colors.textMuted }}>
              Friends
            </Text>
          </View>
        ) : status === 'PENDING' ? (
          <View className="rounded-full px-4 py-1.5" style={{ backgroundColor: Colors.borderLight }}>
            <Text className="text-[14px] font-semibold" style={{ color: Colors.textMuted }}>
              Pending
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            className="rounded-full px-4 py-1.5"
            style={{ backgroundColor: Colors.cta }}
            onPress={(e) => { e.stopPropagation?.(); handleSendRequest(item.id); }}
          >
            <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
              Add Friend
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="border-b px-4 pb-3 pt-2"
        style={{ borderBottomColor: Colors.borderLight, backgroundColor: Colors.white }}
      >
        <Text className="text-[22px] font-bold" style={{ color: Colors.text }}>
          Contacts
        </Text>

        {/* Tabs */}
        <View className="mt-3 flex-row">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className="mr-4 pb-2"
              style={{
                borderBottomWidth: activeTab === tab.key ? 2 : 0,
                borderBottomColor: Colors.cta,
              }}
              onPress={() => setActiveTab(tab.key)}
            >
              <View className="flex-row items-center">
                <Text
                  className="text-[15px] font-medium"
                  style={{ color: activeTab === tab.key ? Colors.cta : Colors.textLight }}
                >
                  {tab.label}
                </Text>
                {tab.badge && tab.badge > 0 ? (
                  <View
                    className="ml-1.5 rounded-full px-1.5"
                    style={{ backgroundColor: Colors.error, minWidth: 18, alignItems: 'center' }}
                  >
                    <Text className="text-[11px] font-bold" style={{ color: Colors.white }}>
                      {tab.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search bar (only in search tab) */}
      {activeTab === 'search' && (
        <View className="px-4 py-2" style={{ backgroundColor: Colors.white }}>
          <View className="flex-row items-center rounded-lg px-3" style={{ backgroundColor: Colors.bg, height: 40 }}>
            <Ionicons name="search" size={18} color={Colors.textLight} />
            <TextInput
              className="ml-2 flex-1 text-[15px]"
              style={{ color: Colors.text }}
              placeholder="Search by name or email..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : activeTab === 'friends' ? (
        <View className="flex-1">
          {/* Friends search + online filter toolbar */}
          <View
            className="flex-row items-center gap-2 px-4 py-2"
            style={{
              backgroundColor: Colors.white,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors.borderLight,
            }}
          >
            <View
              className="flex-1 flex-row items-center rounded-lg px-3"
              style={{ backgroundColor: Colors.bg, height: 36 }}
            >
              <Ionicons name="search" size={15} color={Colors.textLight} />
              <TextInput
                className="ml-2 flex-1 text-[14px]"
                style={{ color: Colors.text }}
                placeholder="Find friends..."
                placeholderTextColor={Colors.textLight}
                value={friendSearchQuery}
                onChangeText={setFriendSearchQuery}
              />
              {friendSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setFriendSearchQuery('')}>
                  <Ionicons name="close-circle" size={15} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setOnlineFilter((f) => (f === 'all' ? 'online' : 'all'))}
              className="rounded-lg px-3 py-1.5"
              style={{ backgroundColor: onlineFilter === 'online' ? Colors.cta : Colors.bg }}
            >
              <Text
                className="text-[13px] font-medium"
                style={{ color: onlineFilter === 'online' ? Colors.white : Colors.textLight }}
              >
                Online
              </Text>
            </TouchableOpacity>
          </View>

          {/* Count */}
          {(friendSearchQuery.trim() || onlineFilter === 'online') && (
            <View className="px-4 py-1.5" style={{ backgroundColor: Colors.bg }}>
              <Text className="text-[12px]" style={{ color: Colors.textMuted }}>
                {friendSearchQuery.trim() ? `Found ` : ``}
                {friendSections.reduce((n, s) => n + s.data.length, 0)} friends
                {onlineFilter === 'online' ? ' online' : ''}
              </Text>
            </View>
          )}

          <SectionList
          sections={friendSections}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 5,
                backgroundColor: Colors.bg,
              }}
            >
              <Text
                style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '600' }}
              >
                {section.title}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cta} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="people-outline" size={48} color={Colors.textLight} />
              <Text className="mt-3 text-[16px]" style={{ color: Colors.textLight }}>
                {friendSearchQuery.trim() || onlineFilter === 'online' ? 'No results found' : 'No friends yet'}
              </Text>
              {!friendSearchQuery.trim() && onlineFilter === 'all' && (
                <Text className="mt-1 text-[14px]" style={{ color: Colors.textLight }}>
                  Search and connect now!
                </Text>
              )}
            </View>
          }
        />
        </View>
      ) : activeTab === 'pending' ? (
        <FlatList
          data={pendingContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderPendingItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cta} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="hourglass-outline" size={48} color={Colors.textLight} />
              <Text className="mt-3 text-[16px]" style={{ color: Colors.textLight }}>
                No pending invitations
              </Text>
            </View>
          }
        />
      ) : activeTab === 'blocked' ? (
        <FlatList
          data={blockedContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cta} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textLight} />
              <Text className="mt-3 text-[16px]" style={{ color: Colors.textLight }}>
                No blocked contacts
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchItem}
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <View className="flex-1 items-center justify-center pt-20">
                <Ionicons name="search-outline" size={48} color={Colors.textLight} />
                <Text className="mt-3 text-[16px]" style={{ color: Colors.textLight }}>
                  No results found
                </Text>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center pt-20">
                <Ionicons name="search-outline" size={48} color={Colors.textLight} />
                <Text className="mt-3 text-[16px]" style={{ color: Colors.textLight }}>
                  Enter name or email to search
                </Text>
              </View>
            )
          }
        />
      )}

      {/* Friend action sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={{ flex: 1 }}>
          {/* Overlay — fades in/out */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: Colors.overlay, opacity: overlayOpacity }]}
          />
          {/* Tap-to-dismiss area */}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeMenu} />

          {/* Sheet — slides up/down */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: Colors.white,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: insets.bottom + 8,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            {/* Handle + name */}
            <View
              className="items-center py-3"
              style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
            >
              <View
                className="w-10 h-1 rounded-full mb-3"
                style={{ backgroundColor: Colors.borderLight }}
              />
              <Text className="text-[16px] font-semibold" style={{ color: Colors.text }}>
                {menuContact ? getContactUser(menuContact).displayName : ''}
              </Text>
            </View>

            {/* Message */}
            <TouchableOpacity
              className="flex-row items-center px-6 py-4"
              onPress={() => {
                const cu = getContactUser(menuContact!);
                closeMenu();
                handleChat(cu);
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={Colors.text} />
              <Text className="ml-3 text-[15px]" style={{ color: Colors.text }}>
                Message
              </Text>
            </TouchableOpacity>

            {/* Block */}
            <TouchableOpacity
              className="flex-row items-center px-6 py-4"
              onPress={() => {
                const cu = getContactUser(menuContact!);
                closeMenu();
                handleBlock(menuContact!, cu.displayName);
              }}
            >
              <Ionicons name="ban-outline" size={20} color={Colors.error} />
              <Text className="ml-3 text-[15px]" style={{ color: Colors.error }}>
                Block
              </Text>
            </TouchableOpacity>

            {/* Remove friend */}
            <TouchableOpacity
              className="flex-row items-center px-6 py-4"
              onPress={() => {
                const cu = getContactUser(menuContact!);
                const cId = menuContact!.id;
                closeMenu();
                handleRemove(cId, cu.displayName);
              }}
            >
              <Ionicons name="person-remove-outline" size={20} color={Colors.error} />
              <Text className="ml-3 text-[15px]" style={{ color: Colors.error }}>
                Remove friend
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              className="mx-4 mt-2 rounded-xl py-3 items-center"
              style={{ backgroundColor: Colors.bg }}
              onPress={closeMenu}
            >
              <Text className="text-[15px] font-medium" style={{ color: Colors.text }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

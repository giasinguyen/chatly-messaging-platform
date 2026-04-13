import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contactService } from '@/services/contact.service';
import { userService } from '@/services/user.service';
import { conversationService } from '@/services/conversation.service';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
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

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [pendingContacts, setPendingContacts] = useState<ContactResponse[]>([]);
  const [blockedContacts, setBlockedContacts] = useState<ContactResponse[]>([]);
  const [searchResults, setSearchResults] = useState<UserResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  const handleUnblock = async (contactId: string) => {
    try {
      await contactService.delete(contactId);
      Alert.alert('Success', 'Unblocked successfully');
      fetchContacts();
      fetchBlocked();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message ?? 'Could not unblock.');
    }
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
    const grouped: Record<string, ContactResponse[]> = {};
    [...contacts]
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
  }, [contacts, user]);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'pending', label: 'Pending', badge: pendingContacts.length },
    { key: 'blocked', label: 'Blocked' },
    { key: 'search', label: 'Search' },
  ];

  const renderContactItem = ({ item }: { item: ContactResponse }) => {
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => handleChat(contactUser)}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.cta} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleUnfriend(item.id, contactUser.displayName)}>
            <Ionicons name="person-remove-outline" size={22} color={Colors.error} />
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
          onPress={() => handleUnblock(item.id)}
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
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
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
            onPress={() => handleSendRequest(item.id)}
          >
            <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
              Add Friend
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
                No friends yet
              </Text>
              <Text className="mt-1 text-[14px]" style={{ color: Colors.textLight }}>
                Search and connect now!
              </Text>
            </View>
          }
        />
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
    </View>
  );
}

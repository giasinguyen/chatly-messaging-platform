import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
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
      Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể chấp nhận.');
    }
  };

  // Decline contact request
  const handleDecline = async (contactId: string) => {
    try {
      await contactService.delete(contactId);
      fetchPending();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể từ chối.');
    }
  };

  // Unblock contact
  const handleUnblock = async (contactId: string) => {
    try {
      await contactService.delete(contactId);
      Alert.alert('Thành công', 'Đã bỏ chặn');
      fetchContacts();
      fetchBlocked();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể bỏ chặn.');
    }
  };

  // Send contact request
  const handleSendRequest = async (contactUserId: string) => {
    try {
      await contactService.sendRequest({ contactId: contactUserId });
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
      fetchPending();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể gửi lời mời.');
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
      Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể tạo cuộc trò chuyện.');
    }
  };

  // Get the other user from a contact record
  const getContactUser = (contact: ContactResponse) => {
    return contact.user.id === user?.id ? contact.contact : contact.user;
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'friends', label: 'Bạn bè' },
    { key: 'pending', label: 'Chờ duyệt', badge: pendingContacts.length },
    { key: 'blocked', label: 'Đã chặn' },
    { key: 'search', label: 'Tìm kiếm' },
  ];

  const renderContactItem = ({ item }: { item: ContactResponse }) => {
    const contactUser = getContactUser(item);
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
        onPress={() => handleChat(contactUser)}
        activeOpacity={0.7}
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
        <TouchableOpacity onPress={() => handleChat(contactUser)}>
          <Ionicons name="chatbubble-outline" size={22} color={Colors.cta} />
        </TouchableOpacity>
      </TouchableOpacity>
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
            {isReceived ? 'Muốn kết bạn với bạn' : 'Đã gửi lời mời'}
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
                Từ chối
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-full px-4 py-1.5"
              style={{ backgroundColor: Colors.cta }}
              onPress={() => handleAccept(item.id)}
            >
              <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
                Chấp nhận
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
            Bỏ chặn
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchItem = ({ item }: { item: UserResponse }) => (
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
      <TouchableOpacity
        className="rounded-full px-4 py-1.5"
        style={{ backgroundColor: Colors.cta }}
        onPress={() => handleSendRequest(item.id)}
      >
        <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
          Kết bạn
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="border-b px-4 pb-3 pt-2"
        style={{ borderBottomColor: Colors.borderLight, backgroundColor: Colors.white }}
      >
        <Text className="text-[22px] font-bold" style={{ color: Colors.text }}>
          Danh bạ
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
              placeholder="Tìm bạn bè theo tên hoặc email..."
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
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cta} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="people-outline" size={48} color={Colors.textLight} />
              <Text className="mt-3 text-[16px]" style={{ color: Colors.textLight }}>
                Chưa có bạn bè
              </Text>
              <Text className="mt-1 text-[14px]" style={{ color: Colors.textLight }}>
                Tìm kiếm và kết bạn ngay!
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
                Không có lời mời nào
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
                Không có liên hệ bị chặn
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
                  Không tìm thấy kết quả
                </Text>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center pt-20">
                <Ionicons name="search-outline" size={48} color={Colors.textLight} />
                <Text className="mt-3 text-[16px]" style={{ color: Colors.textLight }}>
                  Nhập tên hoặc email để tìm kiếm
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

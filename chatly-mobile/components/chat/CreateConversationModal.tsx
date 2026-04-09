import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { contactService } from '@/services/contact.service';
import { conversationService } from '@/services/conversation.service';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { Avatar } from '@/components/ui/Avatar';
import { useRouter } from 'expo-router';
import type { ContactResponse } from '@/types/contact';

type Tab = 'private' | 'group';

interface CreateConversationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateConversationModal({ visible, onClose }: CreateConversationModalProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const conversations = useConversationStore((s) => s.conversations);

  const [activeTab, setActiveTab] = useState<Tab>('private');
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchContacts();
      setActiveTab('private');
      setSearchQuery('');
      setSelectedContactIds(new Set());
      setGroupName('');
    }
  }, [visible]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await contactService.getByStatus('ACCEPTED');
      setContacts(res.result);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContactUser = (contact: ContactResponse) => {
    return contact.user.id === user?.id ? contact.contact : contact.user;
  };

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const contactUser = getContactUser(c);
    return contactUser.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           contactUser.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreatePrivate = async (contactUser: { id: string }) => {
    // Check if conversation already exists
    const existing = conversations.find(
      (c) =>
        c.type === 'PRIVATE' &&
        c.participantIds.includes(contactUser.id) &&
        c.participantIds.includes(user!.id),
    );
    if (existing) {
      onClose();
      router.push(`/chat/${existing.id}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await conversationService.create({
        type: 'PRIVATE',
        participantIds: [contactUser.id],
      });
      onClose();
      router.push(`/chat/${res.result.id}`);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể tạo cuộc trò chuyện.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (selectedContactIds.size < 2) {
      Alert.alert('Lỗi', 'Cần chọn ít nhất 2 thành viên để tạo nhóm');
      return;
    }

    try {
      setSubmitting(true);
      const res = await conversationService.create({
        type: 'GROUP',
        participantIds: Array.from(selectedContactIds),
        name: groupName.trim(),
      });
      onClose();
      router.push(`/chat/${res.result.id}`);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể tạo nhóm.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const renderContactItem = ({ item }: { item: ContactResponse }) => {
    const contactUser = getContactUser(item);
    const isSelected = selectedContactIds.has(contactUser.id);

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
        onPress={() => {
          if (activeTab === 'private') {
            handleCreatePrivate(contactUser);
          } else {
            toggleContactSelection(contactUser.id);
          }
        }}
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
        
        {activeTab === 'group' && (
          <View className="ml-2">
            <Ionicons 
              name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
              size={24} 
              color={isSelected ? Colors.cta : Colors.textMuted} 
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: Colors.bg }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={{ backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}>
          <View className="flex-row items-center justify-between px-4 py-3 pt-6">
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Text style={{ color: Colors.cta, fontSize: 16 }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.text }}>
              Tạo cuộc trò chuyện
            </Text>
            <TouchableOpacity 
              onPress={activeTab === 'group' ? handleCreateGroup : undefined}
              disabled={submitting || (activeTab === 'group' && (selectedContactIds.size === 0 || !groupName.trim()))}
              style={{ opacity: activeTab === 'group' ? 1 : 0 }}
            >
              {submitting ? (
                 <ActivityIndicator size="small" color={Colors.cta} />
              ) : (
                <Text style={{ 
                  color: (selectedContactIds.size > 0 && groupName.trim()) ? Colors.cta : Colors.textMuted, 
                  fontSize: 16, fontWeight: 'bold' 
                }}>
                  Tạo
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row mt-2">
            <TouchableOpacity
              className="flex-1 pb-3 items-center"
              style={{ borderBottomWidth: 2, borderBottomColor: activeTab === 'private' ? Colors.cta : 'transparent' }}
              onPress={() => setActiveTab('private')}
            >
              <Text style={{ color: activeTab === 'private' ? Colors.cta : Colors.textLight, fontWeight: '600', fontSize: 15 }}>
                Chat 1-1
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 pb-3 items-center"
              style={{ borderBottomWidth: 2, borderBottomColor: activeTab === 'group' ? Colors.cta : 'transparent' }}
              onPress={() => setActiveTab('group')}
            >
              <Text style={{ color: activeTab === 'group' ? Colors.cta : Colors.textLight, fontWeight: '600', fontSize: 15 }}>
                Nhóm
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'group' && (
          <View className="px-4 py-3" style={{ backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}>
            <TextInput
              placeholder="Tên nhóm..."
              placeholderTextColor={Colors.textLight}
              value={groupName}
              onChangeText={setGroupName}
              style={{
                backgroundColor: Colors.bg,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                color: Colors.text,
                fontSize: 15
              }}
            />
            {selectedContactIds.size > 0 && (
               <Text style={{ color: Colors.textLight, fontSize: 13, marginTop: 8 }}>
                 Đã chọn {selectedContactIds.size} thành viên
               </Text>
            )}
          </View>
        )}

        {/* Search */}
        <View className="px-4 py-2" style={{ backgroundColor: Colors.white }}>
          <View className="flex-row items-center rounded-lg px-3" style={{ backgroundColor: Colors.bg, height: 40 }}>
            <Ionicons name="search" size={18} color={Colors.textLight} />
            <TextInput
              className="ml-2 flex-1 text-[15px]"
              style={{ color: Colors.text }}
              placeholder="Tìm kiếm bạn bè..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.cta} />
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={renderContactItem}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center pt-10">
                <Text style={{ color: Colors.textLight }}>Không tìm thấy bạn bè nào</Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

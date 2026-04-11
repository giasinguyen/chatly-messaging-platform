import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { groupService } from '@/services/group.service';
import { contactService } from '@/services/contact.service';
import { fileService, type FileUploadResponse } from '@/services/file.service';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { Colors } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import type { GroupMemberResponse, GroupRole } from '@/types/group';
import type { ContactResponse } from '@/types/contact';

export default function GroupInfoScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  
  const conversations = useConversationStore((s) => s.conversations);
  const setConversations = useConversationStore((s) => s.setConversations);
  const conversation = conversations.find((c) => c.id === conversationId);

  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Media & files
  const [mediaFiles, setMediaFiles] = useState<FileUploadResponse[]>([]);
  const [docFiles, setDocFiles] = useState<FileUploadResponse[]>([]);

  const fetchMembers = useCallback(async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const res = await groupService.getMembers(conversationId);
      setMembers(res.result);
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

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

  const handleChangeName = () => {
    if (!canManage) return;
    Alert.prompt('Đổi tên nhóm', 'Nhập tên mới', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Lưu',
        onPress: async (newName?: string) => {
          if (!newName || !newName.trim()) return;
          try {
            const res = await groupService.updateGroup(conversationId, { name: newName.trim() });
            setConversations(conversations.map((c) => (c.id === conversationId ? res.result : c)));
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể đổi tên.');
          }
        },
      },
    ], 'plain-text', conversation?.name);
  };

  const handlePickAvatar = async () => {
    if (!canManage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh.');
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
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đổi ảnh đại diện.');
    }
  };

  const handleMemberAction = (member: GroupMemberResponse) => {
    if (member.userId === user?.id) return;
    
    const options = [];
    if (canManage && member.role !== 'OWNER') {
      options.push({
        text: 'Xóa khỏi nhóm',
        style: 'destructive' as const,
        onPress: async () => {
          try {
            await groupService.removeMember(conversationId, member.userId);
            setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
            Alert.alert('Thành công', 'Đã xóa khỏi nhóm.');
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể xóa thành viên.');
          }
        },
      });
    }

    if (currentUserRole === 'OWNER' && member.role !== 'OWNER') {
      const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
      options.push({
        text: newRole === 'ADMIN' ? 'Chỉ định làm Quản trị viên' : 'Hủy Quản trị viên',
        onPress: async () => {
          try {
            await groupService.updateRole(conversationId, member.userId, { role: newRole as GroupRole });
            setMembers((prev) => prev.map((m) => (m.userId === member.userId ? { ...m, role: newRole as GroupRole } : m)));
            Alert.alert('Thành công', 'Đã cập nhật quyền.');
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không cập nhật được quyền.');
          }
        },
      });
    }

    options.push({ text: 'Hủy', style: 'cancel' });

    if (options.length > 1) {
      Alert.alert(member.displayName, 'Chọn hành động', options);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert('Rời nhóm', 'Bạn có chắc muốn rời khỏi nhóm này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupService.removeMember(conversationId, user?.id || '');
            router.dismissAll();
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể rời nhóm.');
          }
        },
      },
    ]);
  };

  const handleOpenAddModal = () => {
    fetchContacts();
    setAddModalVisible(true);
  };

  const handleAddMember = async (contactUser: any) => {
    try {
      setAddingMember(true);
      const res = await groupService.addMember(conversationId, { userId: contactUser.id });
      setMembers((prev) => [...prev, res.result]);
      setAddModalVisible(false);
      Alert.alert('Thành công', 'Đã thêm thành viên mới.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể thêm thành viên.');
    } finally {
      setAddingMember(false);
    }
  };

  const availableContacts = useMemo(() => {
    return contacts.filter((c) => {
      const contactUser = c.user.id === user?.id ? c.contact : c.user;
      const isMember = members.some((m) => m.userId === contactUser.id);
      if (isMember) return false;
      if (!searchQuery.trim()) return true;
      return contactUser.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [contacts, members, user?.id, searchQuery]);

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-bold" style={{ color: Colors.text }}>
            Thông tin nhóm
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <View className="items-center py-6" style={{ backgroundColor: Colors.white, marginBottom: 8 }}>
              <TouchableOpacity onPress={handlePickAvatar} disabled={!canManage}>
                <View className="relative">
                  <Avatar uri={conversation?.avatarUrl} name={conversation?.name ?? 'Group'} size={80} />
                  {canManage && (
                    <View className="absolute bottom-0 right-0 rounded-full p-1" style={{ backgroundColor: Colors.cta }}>
                      <Ionicons name="camera" size={16} color={Colors.white} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleChangeName} 
                className="mt-3 flex-row items-center" 
                disabled={!canManage}
              >
                <Text className="text-xl font-bold" style={{ color: Colors.text }}>
                  {conversation?.name ?? 'Nhóm chưa đặt tên'}
                </Text>
                {canManage && <Ionicons name="pencil" size={16} color={Colors.textLight} style={{ marginLeft: 6 }} />}
              </TouchableOpacity>
              <Text className="mt-1" style={{ color: Colors.textLight }}>
                {members.length} thành viên
              </Text>
            </View>

            <View className="px-4 py-3 pb-2" style={{ backgroundColor: Colors.white }}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold text-lg" style={{ color: Colors.text }}>Thành viên</Text>
                {canManage && (
                  <TouchableOpacity onPress={handleOpenAddModal} className="flex-row items-center rounded-lg px-2 py-1" style={{ backgroundColor: Colors.ctaLight }}>
                    <Ionicons name="person-add" size={16} color={Colors.cta} />
                    <Text className="ml-1 font-medium" style={{ color: Colors.cta }}>Thêm</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
             onPress={() => handleMemberAction(item)}
             className="flex-row items-center px-4 py-3" 
             style={{ backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
             disabled={item.userId === user?.id}
          >
            <Avatar uri={item.avatar} name={item.displayName} size={40} />
            <View className="ml-3 flex-1">
              <Text className="font-semibold" style={{ color: Colors.text }}>
                {item.userId === user?.id ? 'Bạn' : item.displayName}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: Colors.textLight }}>
                @{item.username}
              </Text>
            </View>
            {item.role !== 'MEMBER' && (
              <View className="rounded px-2 py-0.5" style={{ backgroundColor: item.role === 'OWNER' ? '#FFE8D6' : Colors.ctaLight }}>
                 <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.role === 'OWNER' ? '#D08C60' : Colors.cta }}>
                    {item.role === 'OWNER' ? 'Trưởng nhóm' : 'Quản trị viên'}
                 </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <>
            {/* Media (Ảnh/Video) section */}
            <View style={{ height: 8 }} />
            <View style={{ backgroundColor: Colors.white, padding: 16 }}>
              <Text className="font-semibold text-lg mb-3" style={{ color: Colors.text }}>
                Ảnh/Video
              </Text>
              {mediaFiles.length === 0 ? (
                <Text style={{ color: Colors.textLight, textAlign: 'center', paddingVertical: 12 }}>
                  Chưa có ảnh hoặc video nào
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {mediaFiles.slice(0, 20).map((file) => (
                      <TouchableOpacity
                        key={file.fileId}
                        onPress={() => Linking.openURL(file.url)}
                        style={{ borderRadius: 8, overflow: 'hidden' }}
                      >
                        <Image
                          source={{ uri: file.url }}
                          style={{ width: 80, height: 80, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Files section */}
            <View style={{ height: 8 }} />
            <View style={{ backgroundColor: Colors.white, padding: 16 }}>
              <Text className="font-semibold text-lg mb-3" style={{ color: Colors.text }}>
                Tệp đính kèm
              </Text>
              {docFiles.length === 0 ? (
                <Text style={{ color: Colors.textLight, textAlign: 'center', paddingVertical: 12 }}>
                  Chưa có tệp nào
                </Text>
              ) : (
                docFiles.slice(0, 20).map((file) => (
                  <TouchableOpacity
                    key={file.fileId}
                    onPress={() => Linking.openURL(file.url)}
                    className="flex-row items-center py-3"
                    style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
                  >
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 8,
                        backgroundColor: Colors.bg,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="document-outline" size={20} color={Colors.cta} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="font-medium" style={{ color: Colors.text }} numberOfLines={1}>
                        {file.fileName}
                      </Text>
                      <Text className="text-xs mt-0.5" style={{ color: Colors.textLight }}>
                        {file.fileSize > 1048576
                          ? `${(file.fileSize / 1048576).toFixed(1)} MB`
                          : `${Math.round(file.fileSize / 1024)} KB`}
                        {file.createdAt ? ` · ${new Date(file.createdAt).toLocaleDateString('vi-VN')}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="download-outline" size={20} color={Colors.cta} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Leave group button */}
            <View style={{ height: 8 }} />
            <TouchableOpacity 
              onPress={handleLeaveGroup}
              style={{ backgroundColor: Colors.white, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: Colors.error, fontSize: 16, fontWeight: 'bold' }}>Rời khỏi nhóm</Text>
            </TouchableOpacity>
          </>
        }
      />

      {/* Add Member Modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddModalVisible(false)}>
        <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
          <View className="flex-row items-center justify-between px-4" style={{ height: 60, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}><Text style={{ color: Colors.text, fontSize: 16 }}>Hủy</Text></TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Thêm thành viên</Text>
            <View style={{ width: 40 }} />
          </View>
          <View className="p-3" style={{ backgroundColor: Colors.white }}>
             <TextInput 
               placeholder="Tìm kiếm..." 
               value={searchQuery}
               onChangeText={setSearchQuery}
               style={{ backgroundColor: Colors.bg, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 15 }} 
             />
          </View>
          <FlatList
             data={availableContacts}
             keyExtractor={(item) => item.id}
             ListEmptyComponent={() => <View className="p-4 items-center"><Text style={{ color: Colors.textLight }}>Không có kết quả</Text></View>}
             renderItem={({ item }) => {
               const contactUser = item.user.id === user?.id ? item.contact : item.user;
               return (
                 <TouchableOpacity 
                   onPress={() => handleAddMember(contactUser)}
                   disabled={addingMember}
                   className="flex-row items-center px-4 py-3" 
                   style={{ backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
                 >
                   <Avatar uri={contactUser.avatarUrl} name={contactUser.displayName} size={40} />
                   <View className="ml-3 flex-1">
                     <Text className="font-semibold" style={{ color: Colors.text }}>{contactUser.displayName}</Text>
                   </View>
                   <Ionicons name="add-circle" size={24} color={Colors.cta} />
                 </TouchableOpacity>
               );
             }}
          />
        </View>
      </Modal>
    </View>
  );
}

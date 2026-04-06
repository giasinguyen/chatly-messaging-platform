import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { fileService } from '@/services/file.service';
import { socketService } from '@/services/socket.service';
import { Avatar } from '@/components/ui/Avatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, clearAuth, updateUser } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
          } catch {
            // Ignore logout errors
          }
          socketService.disconnect();
          clearAuth();
        },
      },
    ]);
  }, [clearAuth]);

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalAvatarUri(result.assets[0].uri);
      setEditing(true);
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!user || !displayName.trim()) return;

    setSaving(true);
    try {
      let avatarUrl = user.avatarUrl;

      // Nếu đã chọn ảnh mới, upload lên S3 trước
      if (localAvatarUri) {
        const fileName = localAvatarUri.split('/').pop() ?? 'avatar.jpg';
        const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const uploaded = await fileService.upload(localAvatarUri, fileName, mimeType);
        avatarUrl = uploaded.url;
        setLocalAvatarUri(null);
      }

      const res = await userService.update(user.id, {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl ?? undefined,
      });
      updateUser(res.result);
      setEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể cập nhật hồ sơ.');
    } finally {
      setSaving(false);
    }
  }, [user, displayName, localAvatarUri, updateUser]);

  const settingsItems = [
    {
      icon: 'notifications-outline' as const,
      label: 'Thông báo',
      onPress: () => Alert.alert('Thông báo', 'Tính năng đang phát triển'),
    },
    {
      icon: 'lock-closed-outline' as const,
      label: 'Quyền riêng tư',
      onPress: () => Alert.alert('Quyền riêng tư', 'Tính năng đang phát triển'),
    },
    {
      icon: 'color-palette-outline' as const,
      label: 'Giao diện',
      onPress: () => Alert.alert('Giao diện', 'Tính năng đang phát triển'),
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Trợ giúp',
      onPress: () => Alert.alert('Trợ giúp', 'Tính năng đang phát triển'),
    },
    {
      icon: 'information-circle-outline' as const,
      label: 'Về Chatly',
      onPress: () => Alert.alert('Chatly', 'Phiên bản 1.0.0\nNhóm phát triển Chatly'),
    },
  ];

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      {/* Header */}
      <View
        className="border-b px-4 pb-4 pt-2"
        style={{ borderBottomColor: Colors.borderLight, backgroundColor: Colors.white }}
      >
        <Text className="text-[22px] font-bold" style={{ color: Colors.text }}>
          Cài đặt
        </Text>
      </View>

      {/* Profile Card */}
      <View className="mx-4 mt-4 rounded-2xl p-4" style={{ backgroundColor: Colors.white }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handlePickAvatar} disabled={saving}>
            <View style={{ position: 'relative' }}>
              <Avatar
                uri={localAvatarUri ?? user?.avatarUrl}
                name={user?.displayName ?? 'U'}
                size={64}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: Colors.cta,
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: Colors.white,
                }}
              >
                {saving && localAvatarUri ? (
                  <ActivityIndicator size={12} color={Colors.white} />
                ) : (
                  <Ionicons name="camera" size={13} color={Colors.white} />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <View className="ml-4 flex-1">
            {editing ? (
              <TextInput
                className="rounded-lg border px-3 py-2 text-[16px]"
                style={{
                  borderColor: Colors.cta,
                  color: Colors.text,
                }}
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
              />
            ) : (
              <>
                <Text className="text-[18px] font-bold" style={{ color: Colors.text }}>
                  {user?.displayName}
                </Text>
                <Text className="mt-0.5 text-[14px]" style={{ color: Colors.textLight }}>
                  @{user?.username}
                </Text>
                <Text className="mt-0.5 text-[13px]" style={{ color: Colors.textLight }}>
                  {user?.email}
                </Text>
              </>
            )}
          </View>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={22} color={Colors.cta} />
            </TouchableOpacity>
          )}
        </View>

        {editing && (
          <View className="mt-3 flex-row justify-end gap-2">
            <TouchableOpacity
              className="rounded-lg px-4 py-2"
              style={{ backgroundColor: Colors.bg }}
              onPress={() => {
                setEditing(false);
                setDisplayName(user?.displayName ?? '');
                setLocalAvatarUri(null);
              }}
            >
              <Text style={{ color: Colors.textLight }}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-lg px-4 py-2"
              style={{ backgroundColor: Colors.cta }}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              <Text style={{ color: Colors.white }}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings List */}
      <View className="mx-4 mt-4 rounded-2xl" style={{ backgroundColor: Colors.white }}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            className="flex-row items-center px-4 py-3.5"
            style={{
              borderBottomWidth: index < settingsItems.length - 1 ? 0.5 : 0,
              borderBottomColor: Colors.borderLight,
            }}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={22} color={Colors.text} />
            <Text className="ml-3 flex-1 text-[15px]" style={{ color: Colors.text }}>
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View className="mx-4 mt-4">
        <PrimaryButton title="Đăng xuất" variant="outline" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

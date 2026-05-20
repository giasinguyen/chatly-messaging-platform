import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
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
  const router = useRouter();
  const { user, clearAuth, updateUser } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
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
      Alert.alert('Permission Required', 'Please grant photo library access.');
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

      // If a new avatar was picked, upload it first
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
      Alert.alert('Success', 'Profile updated');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message ?? 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }, [user, displayName, localAvatarUri, updateUser]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Invalid password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setPwdSaving(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPwdModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      try {
        await authService.logout();
      } catch {
        // ignore
      }
      socketService.disconnect();
      await clearAuth();
      Alert.alert(
        'Password updated',
        'Please sign in again with your new password.',
      );
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message ?? 'Could not change password.');
    } finally {
      setPwdSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, clearAuth]);

  const settingsItems = [
    {
      icon: 'notifications-outline' as const,
      label: 'Notifications',
      onPress: () => Alert.alert('Notifications', 'Feature coming soon'),
    },
    {
      icon: 'lock-closed-outline' as const,
      label: 'Privacy',
      onPress: () => Alert.alert('Privacy', 'Feature coming soon'),
    },
    {
      icon: 'color-palette-outline' as const,
      label: 'Appearance',
      onPress: () => Alert.alert('Appearance', 'Feature coming soon'),
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Help & Support',
      onPress: () => Alert.alert('Help', 'Feature coming soon'),
    },
    {
      icon: 'information-circle-outline' as const,
      label: 'About Chatly',
      onPress: () => Alert.alert('Chatly', 'Version 1.0.0\nChatly Team'),
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
          Settings
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
              <Text style={{ color: Colors.textLight }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-lg px-4 py-2"
              style={{ backgroundColor: Colors.cta }}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              <Text style={{ color: Colors.white }}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Change password */}
      <View className="mx-4 mt-4 rounded-2xl" style={{ backgroundColor: Colors.white }}>
        <TouchableOpacity
          className="flex-row items-center px-4 py-3.5"
          onPress={() => setPwdModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="key-outline" size={22} color={Colors.text} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: Colors.text }}>
            Change password
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Devices & sessions (same API as web) */}
      <View className="mx-4 mt-3 rounded-2xl" style={{ backgroundColor: Colors.white }}>
        <TouchableOpacity
          className="flex-row items-center px-4 py-3.5 border-b"
          style={{ borderBottomColor: Colors.borderLight }}
          onPress={() => router.push('/sessions')}
          activeOpacity={0.7}
        >
          <Ionicons name="phone-portrait-outline" size={22} color={Colors.text} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: Colors.text }}>
            Devices & sessions
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        
        <TouchableOpacity
          className="flex-row items-center px-4 py-3.5"
          onPress={() => router.push('/qr-scan')}
          activeOpacity={0.7}
        >
          <Ionicons name="qr-code-outline" size={22} color={Colors.text} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: Colors.text }}>
            Scan QR to Login
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={pwdModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !pwdSaving && setPwdModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => !pwdSaving && setPwdModalVisible(false)}
          />
          <View
            className="rounded-t-3xl px-4 pb-8 pt-4"
            style={{ backgroundColor: Colors.white }}
          >
            <Text className="mb-4 text-[18px] font-bold" style={{ color: Colors.text }}>
              Change password
            </Text>
            <Text className="mb-3 text-[13px]" style={{ color: Colors.textLight }}>
              After changing your password you will need to sign in again on all devices.
            </Text>
            <Text className="mb-1 text-[13px]" style={{ color: Colors.text }}>
              Current password
            </Text>
            <TextInput
              className="mb-3 rounded-lg border px-3 py-2.5 text-[16px]"
              style={{ borderColor: Colors.borderLight, color: Colors.text }}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!pwdSaving}
            />
            <Text className="mb-1 text-[13px]" style={{ color: Colors.text }}>
              New password
            </Text>
            <TextInput
              className="mb-3 rounded-lg border px-3 py-2.5 text-[16px]"
              style={{ borderColor: Colors.borderLight, color: Colors.text }}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!pwdSaving}
            />
            <Text className="mb-1 text-[13px]" style={{ color: Colors.text }}>
              Confirm new password
            </Text>
            <TextInput
              className="mb-4 rounded-lg border px-3 py-2.5 text-[16px]"
              style={{ borderColor: Colors.borderLight, color: Colors.text }}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!pwdSaving}
            />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity
                className="rounded-lg px-4 py-3"
                onPress={() => !pwdSaving && setPwdModalVisible(false)}
                disabled={pwdSaving}
              >
                <Text style={{ color: Colors.textLight }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg px-5 py-3"
                style={{ backgroundColor: Colors.cta }}
                onPress={handleChangePassword}
                disabled={pwdSaving}
              >
                {pwdSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={{ color: Colors.white, fontWeight: '600' }}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
        <PrimaryButton title="Log Out" variant="outline" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

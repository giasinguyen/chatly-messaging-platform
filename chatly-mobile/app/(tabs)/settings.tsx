import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { AppearanceSettingsModal } from '@/components/settings/AppearanceSettingsModal';
import { LanguageSettingsModal } from '@/components/settings/LanguageSettingsModal';
import { PrivacySettingsModal } from '@/components/settings/PrivacySettingsModal';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/store/theme.store';
import { getThemeColors } from '@/utils/themeColors';
import { getApiErrorMessage } from '@/utils/errorHandler';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, clearAuth, updateUser } = useAuthStore();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const setDarkMode = useThemeStore((s) => s.setDarkMode);
  const palette = getThemeColors(isDarkMode);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [appearanceVisible, setAppearanceVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);

  const handleLogout = useCallback(async () => {
    Alert.alert(t('logout.title'), t('logout.description'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('nav.logout'),
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
  }, [clearAuth, t]);

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('mobile.settings.photo_permission_title'),
        t('mobile.settings.photo_permission_body'),
      );
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
  }, [t]);

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
      Alert.alert(t('mobile.common.success'), t('mobile.settings.profile_updated'));
    } catch (error: unknown) {
      Alert.alert(
        t('errors.request_failed'),
        getApiErrorMessage(error, t('mobile.settings.update_profile_failed')),
      );
    } finally {
      setSaving(false);
    }
  }, [user, displayName, localAvatarUri, updateUser, t]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(
        t('mobile.settings.missing_fields'),
        t('mobile.settings.fill_password_fields'),
      );
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        t('settings.change_password.title'),
        t('mobile.settings.password_min_length'),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        t('settings.change_password.title'),
        t('mobile.settings.password_mismatch'),
      );
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
        t('settings.change_password.title'),
        t('settings.change_password.success'),
      );
    } catch (error: unknown) {
      Alert.alert(
        t('errors.request_failed'),
        getApiErrorMessage(error, t('settings.change_password.failed')),
      );
    } finally {
      setPwdSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, clearAuth, t]);

  const settingsItems = useMemo(
    () => [
      {
        icon: 'bookmark-outline' as const,
        label: t('settings.categories.saved_posts'),
        onPress: () => router.push({ pathname: '/saved', params: { returnTo: 'settings' } }),
      },
      {
        icon: 'lock-closed-outline' as const,
        label: t('settings.categories.privacy'),
        onPress: () => setPrivacyVisible(true),
      },
      {
        icon: 'color-palette-outline' as const,
        label: t('settings.categories.appearance'),
        onPress: () => setAppearanceVisible(true),
      },
      {
        icon: 'language-outline' as const,
        label: t('mobile.settings.language_menu'),
        onPress: () => setLanguageVisible(true),
      },
      {
        icon: 'help-circle-outline' as const,
        label: t('mobile.settings.help_support'),
        onPress: () =>
          Alert.alert(t('mobile.settings.help_title'), t('mobile.settings.coming_soon')),
      },
      {
        icon: 'information-circle-outline' as const,
        label: t('mobile.settings.about_chatly'),
        onPress: () =>
          Alert.alert(t('mobile.settings.about_chatly'), t('mobile.settings.about_body')),
      },
    ],
    [router, t],
  );

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: palette.background, paddingTop: insets.top }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      {/* Header */}
      <View
        className="border-b px-4 pb-4 pt-2"
        style={{ borderBottomColor: palette.border, backgroundColor: palette.card }}>
        <Text className="text-[22px] font-bold" style={{ color: palette.text }}>
          {t('settings.title')}
        </Text>
      </View>

      {/* Profile Card */}
      <View className="mx-4 mt-4 rounded-2xl p-4" style={{ backgroundColor: palette.card }}>
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
                  borderColor: palette.card,
                }}>
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
                  color: palette.text,
                  backgroundColor: palette.field,
                }}
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
              />
            ) : (
              <>
                <Text className="text-[18px] font-bold" style={{ color: palette.text }}>
                  {user?.displayName}
                </Text>
                <Text className="mt-0.5 text-[14px]" style={{ color: palette.textLight }}>
                  @{user?.username}
                </Text>
                <Text className="mt-0.5 text-[13px]" style={{ color: palette.textLight }}>
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
              style={{ backgroundColor: palette.field }}
              onPress={() => {
                setEditing(false);
                setDisplayName(user?.displayName ?? '');
                setLocalAvatarUri(null);
              }}>
              <Text style={{ color: palette.textLight }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-lg px-4 py-2"
              style={{ backgroundColor: Colors.cta }}
              onPress={handleSaveProfile}
              disabled={saving}>
              <Text style={{ color: Colors.white }}>
                {saving ? t('mobile.common.saving') : t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Change password */}
      <View className="mx-4 mt-4 rounded-2xl" style={{ backgroundColor: palette.card }}>
        <TouchableOpacity
          className="flex-row items-center px-4 py-3.5"
          onPress={() => setPwdModalVisible(true)}
          activeOpacity={0.7}>
          <Ionicons name="key-outline" size={22} color={palette.text} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: palette.text }}>
            {t('settings.categories.change_password')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
        </TouchableOpacity>
      </View>

      {/* Devices & sessions (same API as web) */}
      <View className="mx-4 mt-3 rounded-2xl" style={{ backgroundColor: palette.card }}>
        <TouchableOpacity
          className="flex-row items-center border-b px-4 py-3.5"
          style={{ borderBottomColor: palette.border }}
          onPress={() => router.push({ pathname: '/sessions', params: { returnTo: 'settings' } })}
          activeOpacity={0.7}>
          <Ionicons name="phone-portrait-outline" size={22} color={palette.text} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: palette.text }}>
            {t('settings.sessions.title')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center px-4 py-3.5"
          onPress={() => router.push('/qr-scan')}
          activeOpacity={0.7}>
          <Ionicons name="qr-code-outline" size={22} color={palette.text} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: palette.text }}>
            {t('mobile.settings.scan_qr')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={pwdModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !pwdSaving && setPwdModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => !pwdSaving && setPwdModalVisible(false)}
          />
          <View className="rounded-t-3xl px-4 pb-8 pt-4" style={{ backgroundColor: palette.card }}>
            <Text className="mb-4 text-[18px] font-bold" style={{ color: palette.text }}>
              {t('settings.change_password.title')}
            </Text>
            <Text className="mb-3 text-[13px]" style={{ color: palette.textLight }}>
              {t('mobile.settings.change_password_hint')}
            </Text>
            <Text className="mb-1 text-[13px]" style={{ color: palette.text }}>
              {t('settings.change_password.current')}
            </Text>
            <TextInput
              className="mb-3 rounded-lg border px-3 py-2.5 text-[16px]"
              style={{ borderColor: palette.border, color: palette.text, backgroundColor: palette.field }}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!pwdSaving}
            />
            <Text className="mb-1 text-[13px]" style={{ color: palette.text }}>
              {t('settings.change_password.new_password')}
            </Text>
            <TextInput
              className="mb-3 rounded-lg border px-3 py-2.5 text-[16px]"
              style={{ borderColor: palette.border, color: palette.text, backgroundColor: palette.field }}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!pwdSaving}
            />
            <Text className="mb-1 text-[13px]" style={{ color: palette.text }}>
              {t('settings.change_password.confirm')}
            </Text>
            <TextInput
              className="mb-4 rounded-lg border px-3 py-2.5 text-[16px]"
              style={{ borderColor: palette.border, color: palette.text, backgroundColor: palette.field }}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!pwdSaving}
            />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity
                className="rounded-lg px-4 py-3"
                onPress={() => !pwdSaving && setPwdModalVisible(false)}
                disabled={pwdSaving}>
                <Text style={{ color: palette.textLight }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg px-5 py-3"
                style={{ backgroundColor: Colors.cta }}
                onPress={handleChangePassword}
                disabled={pwdSaving}>
                {pwdSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={{ color: Colors.white, fontWeight: '600' }}>
                    {t('settings.change_password.update')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings List */}
      <View className="mx-4 mt-4 rounded-2xl" style={{ backgroundColor: palette.card }}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            className="flex-row items-center px-4 py-3.5"
            style={{
              borderBottomWidth: index < settingsItems.length - 1 ? 0.5 : 0,
              borderBottomColor: palette.border,
            }}
            onPress={item.onPress}
            activeOpacity={0.7}>
            <Ionicons name={item.icon} size={22} color={palette.text} />
            <Text className="ml-3 flex-1 text-[15px]" style={{ color: palette.text }}>
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View className="mx-4 mt-4">
        <PrimaryButton title={t('nav.logout')} variant="outline" onPress={handleLogout} />
      </View>

      <PrivacySettingsModal
        visible={privacyVisible}
        isDarkMode={isDarkMode}
        onClose={() => setPrivacyVisible(false)}
      />
      <AppearanceSettingsModal
        visible={appearanceVisible}
        isDarkMode={isDarkMode}
        onToggleDarkMode={(value) => void setDarkMode(value)}
        onClose={() => setAppearanceVisible(false)}
      />
      <LanguageSettingsModal
        visible={languageVisible}
        isDarkMode={isDarkMode}
        onClose={() => setLanguageVisible(false)}
      />
    </ScrollView>
  );
}

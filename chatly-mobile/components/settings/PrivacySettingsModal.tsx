import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { settingsService, type PrivacySettingsType, type UserSettingsType } from '@/services/settings.service';
import { Colors } from '@/constants/theme';
import { getThemeColors } from '@/utils/themeColors';

interface PrivacySettingsModalProps {
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
}

interface PrivacyRowProps {
  label: string;
  description?: string;
  value: boolean;
  disabled: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
}

export function PrivacySettingsModal({ visible, isDarkMode, onClose }: PrivacySettingsModalProps) {
  const { t } = useTranslation();
  const palette = getThemeColors(isDarkMode);
  const [settings, setSettings] = useState<UserSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<keyof PrivacySettingsType | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await settingsService.getSettings();
      if (response.code === 1000) {
        setSettings(response.result);
      }
    } catch {
      Alert.alert(t('errors.request_failed'), t('settings.privacy.load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (visible) {
      void loadSettings();
    }
  }, [loadSettings, visible]);

  const handleToggle = async (key: keyof PrivacySettingsType) => {
    if (!settings || savingKey) return;

    const nextValue = !settings.privacy[key];
    const previousSettings = settings;
    setSavingKey(key);
    setSettings({
      ...settings,
      privacy: { ...settings.privacy, [key]: nextValue },
    });

    try {
      const response = await settingsService.updatePrivacy({ [key]: nextValue });
      if (response.code === 1000) {
        setSettings(response.result);
      } else {
        setSettings(previousSettings);
        Alert.alert(t('errors.request_failed'), response.message ?? t('settings.privacy.update_failed'));
      }
    } catch {
      setSettings(previousSettings);
      Alert.alert(t('errors.request_failed'), t('settings.privacy.update_failed'));
    } finally {
      setSavingKey(null);
    }
  };

  const privacy = settings?.privacy;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View className="flex-row items-center border-b px-4 pb-3 pt-12" style={{ borderBottomColor: palette.border }}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text className="ml-2 text-[20px] font-bold" style={{ color: palette.text }}>
            {t('settings.privacy.title')}
          </Text>
        </View>

        {isLoading && !privacy ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={Colors.cta} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text className="mb-4 text-[14px]" style={{ color: palette.textLight }}>
              {t('settings.privacy.description')}
            </Text>

            <Text className="mb-3 text-[16px] font-bold" style={{ color: palette.text }}>
              {t('settings.privacy.personal_title')}
            </Text>
            <View className="mb-7 rounded-2xl border p-4" style={{ backgroundColor: palette.card, borderColor: palette.border }}>
              <PrivacyRow
                label={t('settings.privacy.show_online_status')}
                value={privacy?.showOnlineStatus ?? true}
                disabled={savingKey !== null}
                onToggle={() => void handleToggle('showOnlineStatus')}
                isDarkMode={isDarkMode}
              />
              <PrivacyRow
                label={t('settings.privacy.show_friend_list')}
                description={t('settings.privacy.show_friend_list_desc')}
                value={privacy?.showFriendList ?? true}
                disabled={savingKey !== null}
                onToggle={() => void handleToggle('showFriendList')}
                isDarkMode={isDarkMode}
              />
            </View>

            <Text className="mb-3 text-[16px] font-bold" style={{ color: palette.text }}>
              {t('settings.privacy.messages_calls_title')}
            </Text>
            <View className="rounded-2xl border p-4" style={{ backgroundColor: palette.card, borderColor: palette.border }}>
              <PrivacyRow
                label={t('settings.privacy.show_seen_status')}
                value={privacy?.showReadReceipts ?? true}
                disabled={savingKey !== null}
                onToggle={() => void handleToggle('showReadReceipts')}
                isDarkMode={isDarkMode}
              />
              <PrivacyRow
                label={t('settings.privacy.allow_friend_requests')}
                value={privacy?.allowFriendRequests ?? true}
                disabled={savingKey !== null}
                onToggle={() => void handleToggle('allowFriendRequests')}
                isDarkMode={isDarkMode}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function PrivacyRow({ label, description, value, disabled, onToggle, isDarkMode }: PrivacyRowProps) {
  const palette = getThemeColors(isDarkMode);

  return (
    <View className="flex-row items-center justify-between gap-4 py-3">
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold" style={{ color: palette.text }}>
          {label}
        </Text>
        {description ? (
          <Text className="mt-1 text-[13px] leading-5" style={{ color: palette.textMuted }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onToggle}
        trackColor={{ false: palette.border, true: Colors.cta }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

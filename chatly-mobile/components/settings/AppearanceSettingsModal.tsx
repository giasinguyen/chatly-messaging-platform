import { Modal, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { getThemeColors } from '@/utils/themeColors';

interface AppearanceSettingsModalProps {
  visible: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: (value: boolean) => void;
  onClose: () => void;
}

export function AppearanceSettingsModal({
  visible,
  isDarkMode,
  onToggleDarkMode,
  onClose,
}: AppearanceSettingsModalProps) {
  const palette = getThemeColors(isDarkMode);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View className="flex-row items-center border-b px-4 pb-3 pt-12" style={{ borderBottomColor: palette.border }}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text className="ml-2 text-[20px] font-bold" style={{ color: palette.text }}>
            Appearance
          </Text>
        </View>

        <View className="p-4">
          <Text className="mb-4 text-[14px]" style={{ color: palette.textLight }}>
            Choose the display mode you find most comfortable.
          </Text>

          <View className="rounded-2xl border p-4" style={{ backgroundColor: palette.card, borderColor: palette.border }}>
            <View className="flex-row items-center justify-between gap-4">
              <View className="min-w-0 flex-1">
                <Text className="text-[16px] font-semibold" style={{ color: palette.text }}>
                  Dark mode
                </Text>
                <Text className="mt-1 text-[13px] leading-5" style={{ color: palette.textMuted }}>
                  Use a darker color palette for settings and supported screens.
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={onToggleDarkMode}
                trackColor={{ false: palette.border, true: Colors.cta }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import {
  getAppLanguage,
  setAppLanguage,
  type SupportedLanguage,
} from '@/lib/i18n';
import { getThemeColors } from '@/utils/themeColors';

interface LanguageSettingsModalProps {
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
}

const LANGUAGE_OPTIONS: { code: SupportedLanguage; labelKey: string }[] = [
  { code: 'vi', labelKey: 'settings.general.vietnamese' },
  { code: 'en', labelKey: 'settings.general.english' },
];

export function LanguageSettingsModal({
  visible,
  isDarkMode,
  onClose,
}: LanguageSettingsModalProps) {
  const { t } = useTranslation();
  const palette = getThemeColors(isDarkMode);
  const current = getAppLanguage();

  const handleSelect = async (lang: SupportedLanguage) => {
    await setAppLanguage(lang);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View className="rounded-t-3xl px-4 pb-8 pt-4" style={{ backgroundColor: palette.card }}>
        <Text className="mb-1 text-[18px] font-bold" style={{ color: palette.text }}>
          {t('settings.general.language_title')}
        </Text>
        <Text className="mb-4 text-[13px]" style={{ color: palette.textLight }}>
          {t('settings.general.change_language')}
        </Text>

        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = current === option.code;
          return (
            <TouchableOpacity
              key={option.code}
              className="mb-2 flex-row items-center rounded-xl px-4 py-3.5"
              style={{
                backgroundColor: isSelected ? `${Colors.cta}18` : palette.field,
                borderWidth: isSelected ? 1 : 0,
                borderColor: Colors.cta,
              }}
              onPress={() => void handleSelect(option.code)}
              activeOpacity={0.7}>
              <Text className="flex-1 text-[15px] font-medium" style={{ color: palette.text }}>
                {t(option.labelKey)}
              </Text>
              {isSelected && <Ionicons name="checkmark-circle" size={22} color={Colors.cta} />}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity className="mt-2 items-center py-3" onPress={onClose}>
          <Text style={{ color: palette.textLight }}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

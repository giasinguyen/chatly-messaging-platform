import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/components/ui/Logo';
import { setAppLanguage, type SupportedLanguage } from '@/lib/i18n';
import { useLanguageOnboardingStore } from '@/store/languageOnboarding.store';

const PURPLE_BACKGROUND = '#f3efff';
const PURPLE_PRIMARY = '#6d35ff';
const PURPLE_DARK = '#2d1768';
const PURPLE_MUTED = '#756a92';
const PURPLE_BORDER = '#d9ccff';
const PURPLE_SELECTED = '#ebe4ff';
const PURPLE_SOFT = '#f7f3ff';

const LANGUAGE_OPTIONS: {
  code: SupportedLanguage;
  titleKey: string;
  subtitleKey: string;
}[] = [
  {
    code: 'vi',
    titleKey: 'mobile.language_onboarding.vietnamese_title',
    subtitleKey: 'mobile.language_onboarding.vietnamese_subtitle',
  },
  {
    code: 'en',
    titleKey: 'mobile.language_onboarding.english_title',
    subtitleKey: 'mobile.language_onboarding.english_subtitle',
  },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const completeLanguageOnboarding = useLanguageOnboardingStore((state) => state.complete);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('vi');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      await setAppLanguage(selectedLanguage);
      await completeLanguageOnboarding();
      router.replace('/');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 px-6" style={{ backgroundColor: PURPLE_BACKGROUND }}>
      <View className="flex-1 justify-center">
        <View className="items-center">
          <View className="mb-7 rounded-[28px] bg-white px-7 py-5 shadow-sm">
            <Logo size="lg" />
          </View>
          <Text className="text-center text-3xl font-bold" style={{ color: PURPLE_DARK }}>
            {t('mobile.language_onboarding.title')}
          </Text>
          <Text
            className="mt-3 max-w-[300px] text-center text-[15px] leading-6"
            style={{ color: PURPLE_MUTED }}>
            {t('mobile.language_onboarding.subtitle')}
          </Text>
        </View>

        <View className="mt-10 gap-3">
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selectedLanguage === option.code;
            return (
              <TouchableOpacity
                key={option.code}
                activeOpacity={0.78}
                className="flex-row items-center rounded-2xl border bg-white px-4 py-4"
                style={{
                  borderColor: isSelected ? PURPLE_PRIMARY : PURPLE_BORDER,
                  backgroundColor: isSelected ? PURPLE_SELECTED : '#ffffff',
                }}
                onPress={() => setSelectedLanguage(option.code)}>
                <View
                  className="mr-4 h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: isSelected ? PURPLE_PRIMARY : PURPLE_SOFT }}>
                  <Text
                    className="text-base font-bold"
                    style={{ color: isSelected ? '#ffffff' : PURPLE_DARK }}>
                    {option.code.toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-semibold" style={{ color: PURPLE_DARK }}>
                    {t(option.titleKey)}
                  </Text>
                  <Text className="mt-0.5 text-[13px]" style={{ color: PURPLE_MUTED }}>
                    {t(option.subtitleKey)}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={PURPLE_PRIMARY} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isSaving}
        className="mb-10 h-14 flex-row items-center justify-center rounded-2xl"
        style={{ backgroundColor: PURPLE_PRIMARY }}
        onPress={handleContinue}>
        {isSaving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Text className="text-[16px] font-bold text-white">
              {t('mobile.language_onboarding.continue')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

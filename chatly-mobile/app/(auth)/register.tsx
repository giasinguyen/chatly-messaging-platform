import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/ui/Logo';
import { AuthInput } from '@/components/ui/AuthInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/utils/errorHandler';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/store/theme.store';
import { getThemeColors } from '@/utils/themeColors';

interface FormErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const palette = getThemeColors(isDarkMode);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = t('mobile.auth.register.display_name_required');
    }
    if (!username.trim()) {
      newErrors.username = t('mobile.auth.register.username_required');
    } else if (username.length < 3) {
      newErrors.username = t('mobile.auth.register.username_min_length');
    }
    if (!email.trim()) {
      newErrors.email = t('mobile.auth.register.email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('mobile.auth.register.invalid_email');
    }
    if (!password) {
      newErrors.password = t('mobile.auth.register.password_required');
    } else if (password.length < 6) {
      newErrors.password = t('mobile.auth.register.password_min_length');
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('mobile.auth.register.password_mismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.register({
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      await setAuth(response.result);
      router.replace('/(tabs)/chats');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, t('auth.register.failed'));
      Alert.alert(t('auth.register.failed'), message);
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ backgroundColor: palette.background }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8 items-center">
          <Logo size="md" />
          <Text
            className="mt-2 text-center text-base"
            style={{ color: palette.textMuted }}
          >
            {t('mobile.auth.register.title')}
          </Text>
        </View>

        {/* Form */}
        <View className="mb-4">
          <AuthInput
            label={t('auth.register.display_name')}
            icon="person-outline"
            placeholder={t('profile.display_name_placeholder')}
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              clearError('displayName');
            }}
            error={errors.displayName}
            returnKeyType="next"
          />

          <AuthInput
            label={t('auth.register.username')}
            icon="at-outline"
            placeholder={t('profile.username_placeholder')}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              clearError('username');
            }}
            error={errors.username}
            autoCapitalize="none"
            returnKeyType="next"
          />

          <AuthInput
            label={t('profile.email')}
            icon="mail-outline"
            placeholder={t('profile.email_placeholder')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearError('email');
            }}
            error={errors.email}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <AuthInput
            label={t('auth.register.password')}
            icon="lock-closed-outline"
            placeholder={t('mobile.auth.login.password_placeholder')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError('password');
            }}
            error={errors.password}
            secureTextEntry
            returnKeyType="next"
          />

          <AuthInput
            label={t('mobile.auth.register.confirm_password')}
            icon="shield-checkmark-outline"
            placeholder={t('mobile.auth.register.confirm_password_placeholder')}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearError('confirmPassword');
            }}
            error={errors.confirmPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
        </View>

        {/* Register Button */}
        <PrimaryButton
          title={t('mobile.auth.register.sign_up')}
          loading={loading}
          onPress={handleRegister}
        />

        {/* Login Link */}
        <View className="mt-6 items-center justify-center">
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: Colors.cta }}>{t('auth.register.already_have_account')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

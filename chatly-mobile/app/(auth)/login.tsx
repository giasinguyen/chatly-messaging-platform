import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const palette = getThemeColors(isDarkMode);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Please enter email or phone number';
    }
    if (!password) {
      newErrors.password = 'Please enter password';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.login({
        identifier: identifier.trim(),
        password,
      });

      await setAuth(response.result);
      router.replace('/(tabs)/chats');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Login failed. Please try again.');
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      Alert.alert('Email required', 'Enter the email address for your account.');
      return;
    }
    const simple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!simple.test(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await authService.forgotPassword(trimmed);
      Alert.alert(
        'Check your email',
        res.message ?? 'If this email is registered, a new password has been sent.',
      );
      setForgotOpen(false);
      setForgotEmail('');
    } catch (error: unknown) {
      Alert.alert('Request failed', getApiErrorMessage(error, 'Could not send reset email.'));
    } finally {
      setForgotLoading(false);
    }
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
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-10 items-center">
          <Logo size="lg" />
          <Text
            className="mt-3 text-center text-base"
            style={{ color: palette.textMuted }}
          >
            Connect anytime, anywhere
          </Text>
        </View>

        {/* Form */}
        <View className="mb-6">
          <AuthInput
            label="Email or Phone Number"
            icon="person-outline"
            placeholder="example@email.com"
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
            }}
            error={errors.identifier}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <AuthInput
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            className="mt-2 self-end"
            onPress={() => {
              setForgotEmail(identifier.includes('@') ? identifier.trim() : '');
              setForgotOpen(true);
            }}
            hitSlop={8}
          >
            <Text style={{ color: Colors.cta, fontSize: 14 }}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <PrimaryButton title="Sign In" loading={loading} onPress={handleLogin} />

        {/* Register Link */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text style={{ color: palette.textMuted }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="font-semibold" style={{ color: Colors.cta }}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={forgotOpen} transparent animationType="fade" onRequestClose={() => !forgotLoading && setForgotOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={() => !forgotLoading && setForgotOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View className="rounded-2xl p-5" style={{ backgroundColor: palette.card }}>
              <Text className="text-[18px] font-bold" style={{ color: palette.text }}>
                Forgot password
              </Text>
              <Text className="mt-2 text-[14px]" style={{ color: palette.textLight }}>
                Enter your account email. We will send a new temporary password if the account exists.
              </Text>
              <AuthInput
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleForgotPassword}
              />
              <View className="mt-4 flex-row justify-end gap-2">
                <TouchableOpacity
                  className="rounded-lg px-4 py-2"
                  disabled={forgotLoading}
                  onPress={() => setForgotOpen(false)}
                >
                  <Text style={{ color: palette.textLight }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-lg px-5 py-2"
                  style={{ backgroundColor: Colors.cta }}
                  disabled={forgotLoading}
                  onPress={handleForgotPassword}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={{ color: Colors.white, fontWeight: '600' }}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

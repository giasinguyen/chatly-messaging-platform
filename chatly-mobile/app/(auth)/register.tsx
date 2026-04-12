import { useState } from 'react';
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

interface FormErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

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
      newErrors.displayName = 'Please enter your display name';
    }
    if (!username.trim()) {
      newErrors.username = 'Please enter your username';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!password) {
      newErrors.password = 'Please enter a password';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Registration failed. Please try again.');
      Alert.alert('Registration Failed', message);
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
      style={{ backgroundColor: Colors.bg }}
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
            style={{ color: Colors.textMuted }}
          >
            Create a new account
          </Text>
        </View>

        {/* Form */}
        <View className="mb-4">
          <AuthInput
            label="Display Name"
            icon="person-outline"
            placeholder="John Doe"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              clearError('displayName');
            }}
            error={errors.displayName}
            returnKeyType="next"
          />

          <AuthInput
            label="Username"
            icon="at-outline"
            placeholder="username"
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
            label="Email"
            icon="mail-outline"
            placeholder="example@email.com"
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
            label="Password"
            icon="lock-closed-outline"
            placeholder="At least 6 characters"
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
            label="Confirm Password"
            icon="shield-checkmark-outline"
            placeholder="Re-enter password"
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
        <PrimaryButton title="Sign Up" loading={loading} onPress={handleRegister} />

        {/* Login Link */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text style={{ color: Colors.textMuted }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="font-semibold" style={{ color: Colors.cta }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

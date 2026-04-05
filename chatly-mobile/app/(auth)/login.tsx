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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Vui lòng nhập email hoặc số điện thoại';
    }
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu ít nhất 6 ký tự';
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
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại.');
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
    }
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
            style={{ color: Colors.textMuted }}
          >
            Kết nối mọi lúc, mọi nơi
          </Text>
        </View>

        {/* Form */}
        <View className="mb-6">
          <AuthInput
            label="Email hoặc Số điện thoại"
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
            label="Mật khẩu"
            icon="lock-closed-outline"
            placeholder="Nhập mật khẩu"
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
        </View>

        {/* Login Button */}
        <PrimaryButton title="Đăng nhập" loading={loading} onPress={handleLogin} />

        {/* Register Link */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text style={{ color: Colors.textMuted }}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="font-semibold" style={{ color: Colors.cta }}>
              Đăng ký ngay
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

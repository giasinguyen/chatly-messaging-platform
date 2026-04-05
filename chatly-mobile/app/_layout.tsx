import '../global.css';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth.store';
import { setupAxiosInterceptors } from '@/lib/axiosClient';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrated, hydrate, setAuth, clearAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Hydrate auth state from AsyncStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Setup axios interceptors
  useEffect(() => {
    setupAxiosInterceptors({
      onTokenRefreshed: (payload) => setAuth(payload),
      onLogout: () => clearAuth(),
    });
  }, [setAuth, clearAuth]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!hydrated) return;

    const inAuth = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)/chats');
    }
  }, [isAuthenticated, hydrated, segments, router]);

  // Show loading while hydrating
  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <Slot />
      </AuthGate>
    </SafeAreaProvider>
  );
}

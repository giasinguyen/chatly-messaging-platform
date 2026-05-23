import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sessionService } from '@/services/session.service';
import { authService } from '@/services/auth.service';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import type { UserSessionInfo } from '@/types/auth';
import { Colors } from '@/constants/theme';

type ReturnTab = 'home' | 'chats' | 'contacts' | 'assistant' | 'settings';

function isReturnTab(value: string | string[] | undefined): value is ReturnTab {
  return (
    value === 'home' ||
    value === 'chats' ||
    value === 'contacts' ||
    value === 'assistant' ||
    value === 'settings'
  );
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function geoLine(s: UserSessionInfo): string | null {
  const g = s.geoSnapshot;
  if (!g) return null;
  const parts: string[] = [];
  if (g.connection?.isp) parts.push(g.connection.isp);
  if (g.timezone?.id) parts.push(g.timezone.id);
  if (g.country_code && parts.length === 0) parts.push(g.country_code);
  return parts.length ? parts.join(' · ') : null;
}

function isRevoked(s: UserSessionInfo): boolean {
  return s.revoked === true;
}

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const returnTab: ReturnTab = isReturnTab(params.returnTo) ? params.returnTo : 'settings';

  const handleBack = useCallback(() => {
    router.replace(`/(tabs)/${returnTab}`);
  }, [returnTab, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sessionService.list();
      if (res.code === 1000 && res.result) setSessions(res.result);
    } catch {
      Alert.alert('Error', 'Could not load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onPurgeAll = () => {
    Alert.alert(
      'Clear all sessions?',
      'This removes every session record and signs out all devices including this one. You will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            try {
              setPurging(true);
              await sessionService.purgeAll();
              try {
                await authService.logout();
              } catch {
                /* ignore */
              }
              socketService.disconnect();
              await clearAuth();
              router.replace('/(auth)/login');
            } catch (e: unknown) {
              const msg =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Could not clear sessions.';
              Alert.alert('Error', msg);
            } finally {
              setPurging(false);
            }
          },
        },
      ]
    );
  };

  const onRevoke = async (row: UserSessionInfo) => {
    if (row.revoked) return;
    try {
      setRevoking(row.id);
      await sessionService.revoke(row.id);
      if (row.current) {
        try {
          await authService.logout();
        } catch {
          /* ignore */
        }
        socketService.disconnect();
        await clearAuth();
        router.replace('/(auth)/login');
      } else {
        await load();
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not revoke session.';
      Alert.alert('Error', msg);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center border-b px-4 py-3"
        style={{ borderBottomColor: Colors.borderLight, backgroundColor: Colors.white }}>
        <TouchableOpacity onPress={handleBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="ml-2 flex-1 text-[18px] font-bold" style={{ color: Colors.text }}>
          Devices & sessions
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Text className="mb-3 text-[13px]" style={{ color: Colors.textLight }}>
          Full history including ended sessions. Use the button below to remove every row and sign
          out everywhere.
        </Text>
        <TouchableOpacity
          className="mb-4 self-start rounded-lg px-4 py-3"
          style={{ backgroundColor: Colors.error }}
          disabled={purging || loading}
          onPress={onPurgeAll}>
          <Text style={{ color: Colors.white, fontWeight: '600', fontSize: 14 }}>
            {purging ? 'Clearing…' : 'Clear all & sign out everywhere'}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={Colors.cta} />
        ) : sessions.length === 0 ? (
          <Text style={{ color: Colors.textLight }}>No session history.</Text>
        ) : (
          sessions.map((s) => {
            const extra = geoLine(s);
            return (
              <View
                key={s.id}
                className="mb-3 rounded-2xl border p-4"
                style={{
                  borderColor: Colors.borderLight,
                  backgroundColor: isRevoked(s) ? `${Colors.bg}` : Colors.white,
                  opacity: isRevoked(s) ? 0.92 : 1,
                }}>
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Ionicons
                        name={
                          s.platform === 'MOBILE' ? 'phone-portrait-outline' : 'desktop-outline'
                        }
                        size={18}
                        color={Colors.textMuted}
                      />
                      <Text className="font-semibold" style={{ color: Colors.text }}>
                        {s.platform === 'MOBILE' ? 'Mobile' : 'Web'}
                      </Text>
                      {isRevoked(s) ? (
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: Colors.borderLight }}>
                          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>
                            Logged out
                          </Text>
                        </View>
                      ) : (
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: '#d1fae5' }}>
                          <Text className="text-[11px]" style={{ color: '#065f46' }}>
                            Active
                          </Text>
                        </View>
                      )}
                      {s.current && !isRevoked(s) && (
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: `${Colors.cta}22` }}>
                          <Text className="text-[11px]" style={{ color: Colors.cta }}>
                            This device
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-1 text-[13px]" style={{ color: Colors.textLight }}>
                      {s.deviceLabel ?? 'Unknown device'}
                    </Text>
                    <Text className="mt-1 text-[12px]" style={{ color: Colors.textMuted }}>
                      {s.locationLabel ? `${s.locationLabel} · ` : ''}
                      {s.ipAddress ? `IP ${s.ipAddress} · ` : ''}
                      Last seen {formatWhen(s.lastSeenAt ?? s.createdAt)}
                      {isRevoked(s) && s.revokedAt
                        ? ` · Logged out ${formatWhen(s.revokedAt)}`
                        : ''}
                    </Text>
                    {extra ? (
                      <Text className="mt-0.5 text-[12px]" style={{ color: Colors.textMuted }}>
                        {extra}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {!isRevoked(s) ? (
                  <TouchableOpacity
                    className="mt-3 self-start rounded-lg px-4 py-2"
                    style={{ borderWidth: 1, borderColor: Colors.borderLight }}
                    disabled={revoking === s.id}
                    onPress={() => onRevoke(s)}>
                    <Text style={{ color: Colors.text, fontSize: 13 }}>
                      {revoking === s.id ? '…' : s.current ? 'Sign out this device' : 'Revoke'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text className="mt-3 text-[12px]" style={{ color: Colors.textMuted }}>
                    Logged out
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

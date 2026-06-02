import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { groupService } from '@/services/group.service';
import { useNotificationStore } from '@/store/notification.store';
import type { PendingJoinResponse } from '@/types/group';

export default function PendingRequestsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<PendingJoinResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const fetchRequests = useCallback(async () => {
    if (!id) return;
    try {
      const res = await groupService.getPendingRequests(id);
      setRequests(res.result ?? []);
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.load_pending_failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Re-fetch when new notifications arrive (real-time)
  useEffect(() => {
    if (!loading) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount]);

  const handleApprove = async (userId: string) => {
    if (!id) return;
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await groupService.approvePendingRequest(id, userId);
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.approve_failed'));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleReject = async (userId: string) => {
    if (!id) return;
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await groupService.rejectPendingRequest(id, userId);
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
    } catch {
      Alert.alert(t('errors.request_failed'), t('mobile.chat.reject_failed'));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const renderItem = ({ item }: { item: PendingJoinResponse }) => {
    const isProcessing = processingIds.has(item.userId);
    return (
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Avatar
          uri={item.avatarUrl ?? undefined}
          name={item.displayName}
          size={48}
        />
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold" style={{ color: Colors.text }}>
            {item.displayName}
          </Text>
          <Text className="text-xs" style={{ color: Colors.textMuted }}>
            @{item.username}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => handleApprove(item.userId)}
            disabled={isProcessing}
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: Colors.cta, opacity: isProcessing ? 0.5 : 1 }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleReject(item.userId)}
            disabled={isProcessing}
            className="rounded-full px-3 py-1.5 border border-gray-300"
            style={{ opacity: isProcessing ? 0.5 : 1 }}
          >
            <Ionicons name="close" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Text
            className="flex-1 text-center text-lg font-bold"
            style={{ color: Colors.text }}
          >
            {t('mobile.chat.pending_requests_title', { count: requests.length })}
          </Text>
          <View className="w-8" />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : requests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          <Text
            className="text-base mt-4 text-center"
            style={{ color: Colors.textMuted }}
          >
            {t('mobile.chat.no_pending_requests')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRequests();
              }}
              tintColor={Colors.cta}
            />
          }
        />
      )}
    </View>
  );
}

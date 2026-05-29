import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { groupService } from '@/services/group.service';
import type { InviteLinkInfoResponse } from '@/types/group';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

type PageStatus = 'loading' | 'preview' | 'joining' | 'success' | 'pending' | 'error';

export default function JoinByInviteScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [groupInfo, setGroupInfo] = useState<InviteLinkInfoResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState(t('mobile.chat.join_failed_default'));
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t('mobile.chat.join_invalid_link'));
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;

    groupService
      .getInviteLinkInfo(token)
      .then((res) => {
        const info = res.result;
        setGroupInfo(info);
        setConversationId(info.conversationId);

        if (info.alreadyMember) {
          setStatus('success');
        } else if (info.hasPendingRequest) {
          setStatus('pending');
        } else {
          setStatus('preview');
        }
      })
      .catch(() => {
        setErrorMsg(t('mobile.chat.join_load_info_failed'));
        setStatus('error');
      });
  }, [token, t]);

  const handleJoin = async () => {
    if (!token) return;
    setStatus('joining');
    try {
      const res = await groupService.joinByInviteLink(token);
      if (res.result.role === null || res.result.role === undefined) {
        setStatus('pending');
      } else {
        setStatus('success');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('mobile.chat.join_failed_default');
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const navigateToChat = () => {
    if (conversationId) {
      router.replace(`/chat/${conversationId}`);
    } else {
      router.replace('/');
    }
  };

  if (status === 'loading' || status === 'joining') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-gray-500">
          {status === 'loading' ? t('mobile.chat.join_loading') : t('mobile.chat.join_joining')}
        </Text>
      </View>
    );
  }

  if (status === 'preview' && groupInfo) {
    const initial = groupInfo.name?.charAt(0)?.toUpperCase() ?? 'G';
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        {groupInfo.avatarUrl ? (
          <Image
            source={{ uri: groupInfo.avatarUrl }}
            className="h-24 w-24 rounded-full"
          />
        ) : (
          <View className="h-24 w-24 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-3xl font-bold text-blue-600">{initial}</Text>
          </View>
        )}
        <Text className="mt-4 text-xl font-semibold">{groupInfo.name}</Text>
        <View className="mt-2 flex-row items-center">
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text className="ml-1 text-gray-500">
            {t('mobile.chat.members_label', { count: groupInfo.memberCount })}
          </Text>
        </View>
        {groupInfo.requireApproval && (
          <Text className="mt-2 text-xs text-gray-400">
            {t('mobile.chat.require_approval_hint')}
          </Text>
        )}
        <TouchableOpacity
          className="mt-6 w-full rounded-xl bg-blue-500 py-3"
          onPress={handleJoin}
        >
          <Text className="text-center text-white font-semibold">
            {groupInfo.requireApproval
              ? t('mobile.chat.join_request')
              : t('mobile.chat.join_action')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-3 w-full rounded-xl border border-gray-300 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-center text-gray-600">{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
        <Text className="mt-4 text-lg font-semibold">{t('mobile.chat.join_success_title')}</Text>
        <Text className="mt-2 text-sm text-gray-500">{t('mobile.chat.join_success_subtitle')}</Text>
        <TouchableOpacity
          className="mt-6 w-full rounded-xl bg-blue-500 py-3"
          onPress={navigateToChat}
        >
          <Text className="text-center text-white font-semibold">
            {t('mobile.chat.join_open_conversation')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'pending') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="time-outline" size={48} color="#f59e0b" />
        <Text className="mt-4 text-lg font-semibold">{t('mobile.chat.join_pending')}</Text>
        <Text className="mt-2 text-sm text-gray-500 text-center">
          {t('mobile.chat.pending_request_body')}
        </Text>
        <TouchableOpacity
          className="mt-6 w-full rounded-xl bg-blue-500 py-3"
          onPress={() => router.replace('/')}
        >
          <Text className="text-center text-white font-semibold">
            {t('mobile.chat.join_go_chats')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Ionicons name="close-circle" size={48} color="#ef4444" />
      <Text className="mt-4 text-lg font-semibold">{t('mobile.chat.join_failed_title')}</Text>
      <Text className="mt-2 text-sm text-gray-500 text-center">{errorMsg}</Text>
      <TouchableOpacity
        className="mt-6 w-full rounded-xl bg-blue-500 py-3"
        onPress={() => router.replace('/')}
      >
        <Text className="text-center text-white font-semibold">
          {t('mobile.chat.join_go_chats')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

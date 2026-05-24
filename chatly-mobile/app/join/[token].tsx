import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { groupService } from '@/services/group.service';
import type { InviteLinkInfoResponse } from '@/types/group';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

type PageStatus = 'loading' | 'preview' | 'joining' | 'success' | 'pending' | 'error';

export default function JoinByInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [groupInfo, setGroupInfo] = useState<InviteLinkInfoResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('Failed to join group');
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid invite link');
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
        setErrorMsg('Failed to load group info. The link might have expired or is invalid.');
        setStatus('error');
      });
  }, [token]);

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
      const msg = e instanceof Error ? e.message : 'Failed to join group.';
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
          {status === 'loading' ? 'Loading group info...' : 'Joining group...'}
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
          <Text className="ml-1 text-gray-500">{groupInfo.memberCount} members</Text>
        </View>
        {groupInfo.requireApproval && (
          <Text className="mt-2 text-xs text-gray-400">
            This group requires admin approval to join
          </Text>
        )}
        <TouchableOpacity
          className="mt-6 w-full rounded-xl bg-blue-500 py-3"
          onPress={handleJoin}
        >
          <Text className="text-center text-white font-semibold">
            {groupInfo.requireApproval ? 'Request to join' : 'Join group'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-3 w-full rounded-xl border border-gray-300 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-center text-gray-600">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
        <Text className="mt-4 text-lg font-semibold">Joined group successfully!</Text>
        <Text className="mt-2 text-sm text-gray-500">Start chatting now!</Text>
        <TouchableOpacity
          className="mt-6 w-full rounded-xl bg-blue-500 py-3"
          onPress={navigateToChat}
        >
          <Text className="text-center text-white font-semibold">Open conversation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'pending') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="time-outline" size={48} color="#f59e0b" />
        <Text className="mt-4 text-lg font-semibold">Request pending</Text>
        <Text className="mt-2 text-sm text-gray-500 text-center">
          Your join request has been sent. Please wait for the group admin to approve.
        </Text>
        <TouchableOpacity
          className="mt-6 w-full rounded-xl bg-blue-500 py-3"
          onPress={() => router.replace('/')}
        >
          <Text className="text-center text-white font-semibold">Go to chats</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Ionicons name="close-circle" size={48} color="#ef4444" />
      <Text className="mt-4 text-lg font-semibold">Failed to join</Text>
      <Text className="mt-2 text-sm text-gray-500 text-center">{errorMsg}</Text>
      <TouchableOpacity
        className="mt-6 w-full rounded-xl bg-blue-500 py-3"
        onPress={() => router.replace('/')}
      >
        <Text className="text-center text-white font-semibold">Go to chats</Text>
      </TouchableOpacity>
    </View>
  );
}

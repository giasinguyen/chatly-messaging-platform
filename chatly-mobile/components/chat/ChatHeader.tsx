import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useCallContext } from '@/contexts/CallContext';
import { useCallStore } from '@/store/call.store';
import { GroupCallMemberPicker } from '@/components/call/GroupCallMemberPicker';
import type { CallType } from '@/types/call';

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  memberCount?: number;
  isGroup?: boolean;
  conversationId?: string;
  receiverId?: string;
  onToggleSearch?: () => void;
  onPressInfo?: () => void;
}

export function ChatHeader({
  name,
  avatarUrl,
  isOnline = false,
  memberCount,
  isGroup = false,
  conversationId,
  receiverId,
  onToggleSearch,
  onPressInfo,
}: ChatHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { initiateCall, initiateGroupCall } = useCallContext();
  const callStatus = useCallStore((s) => s.callStatus);

  const [memberPicker, setMemberPicker] = useState<{
    visible: boolean;
    callType: CallType;
  }>({ visible: false, callType: 'VOICE' });

  const showPrivateCallButtons = !isGroup && !!conversationId && !!receiverId;
  const showGroupCallButtons = isGroup && !!conversationId;
  const callDisabled = callStatus !== 'IDLE';

  const subtitle = isGroup
    ? `${memberCount ?? 0} members`
    : isOnline
      ? 'Active now'
      : 'Offline';

  const handleGroupVoiceCall = () => {
    if (!conversationId) return;
    setMemberPicker({ visible: true, callType: 'VOICE' });
  };

  const handleGroupVideoCall = () => {
    if (!conversationId) return;
    setMemberPicker({ visible: true, callType: 'VIDEO' });
  };

  const handleStartGroupCall = (selectedMemberIds: string[]) => {
    if (!conversationId) return;
    setMemberPicker({ visible: false, callType: 'VOICE' });
    initiateGroupCall(conversationId, memberPicker.callType, name, memberCount ?? 0, selectedMemberIds, avatarUrl);
  };

  const handleCloseMemberPicker = () => {
    setMemberPicker({ visible: false, callType: 'VOICE' });
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: Colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
      }}
    >
      <View className="flex-row items-center px-2 py-2">
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="items-center justify-center"
          style={{ width: 40, height: 40 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={Colors.cta} />
        </TouchableOpacity>

        {/* Content wrapper */}
        <TouchableOpacity 
          className="flex-1 flex-row items-center ml-1" 
          onPress={onPressInfo}
          disabled={!onPressInfo}
        >
          {/* Avatar */}
          <Avatar
            uri={avatarUrl}
            name={name}
            size={40}
            showOnline={!isGroup}
            isOnline={isOnline}
          />

          {/* Name & status */}
          <View className="ml-2.5 flex-1">
          <Text
            className="text-base font-semibold"
            style={{ color: Colors.text }}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text className="text-xs" style={{ color: isOnline ? Colors.online : Colors.textMuted }}>
            {subtitle}
          </Text>
        </View>
        </TouchableOpacity>

        {/* Action buttons */}
        <TouchableOpacity onPress={onToggleSearch} className="mx-1 p-2">
          <Ionicons name="search-outline" size={22} color={Colors.cta} />
        </TouchableOpacity>

        {/* Private call buttons */}
        {showPrivateCallButtons && (
          <>
            <TouchableOpacity
              className="mx-1 p-2"
              disabled={callDisabled}
              onPress={() => initiateCall(receiverId!, conversationId!, 'VOICE', name, avatarUrl ?? null)}
              style={{ opacity: callDisabled ? 0.4 : 1 }}
            >
              <Ionicons name="call-outline" size={22} color={Colors.cta} />
            </TouchableOpacity>
            <TouchableOpacity
              className="mx-1 p-2"
              disabled={callDisabled}
              onPress={() => initiateCall(receiverId!, conversationId!, 'VIDEO', name, avatarUrl ?? null)}
              style={{ opacity: callDisabled ? 0.4 : 1 }}
            >
              <Ionicons name="videocam-outline" size={24} color={Colors.cta} />
            </TouchableOpacity>
          </>
        )}

        {/* Group call buttons */}
        {showGroupCallButtons && (
          <>
            <TouchableOpacity
              className="mx-1 p-2"
              disabled={callDisabled}
              onPress={handleGroupVoiceCall}
              style={{ opacity: callDisabled ? 0.4 : 1 }}
            >
              <Ionicons name="call-outline" size={22} color={Colors.cta} />
            </TouchableOpacity>
            <TouchableOpacity
              className="mx-1 p-2"
              disabled={callDisabled}
              onPress={handleGroupVideoCall}
              style={{ opacity: callDisabled ? 0.4 : 1 }}
            >
              <Ionicons name="videocam-outline" size={24} color={Colors.cta} />
            </TouchableOpacity>
          </>
        )}

        {onPressInfo && (
          <TouchableOpacity onPress={onPressInfo} className="mx-1 p-2">
            <Ionicons name="information-circle-outline" size={24} color={Colors.cta} />
          </TouchableOpacity>
        )}
      </View>

      {/* Group call member picker */}
      <GroupCallMemberPicker
        visible={memberPicker.visible}
        conversationId={conversationId ?? ''}
        groupName={name}
        groupAvatar={avatarUrl}
        callType={memberPicker.callType}
        onCall={handleStartGroupCall}
        onClose={handleCloseMemberPicker}
      />
    </View>
  );
}


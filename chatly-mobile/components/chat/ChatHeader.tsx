import { View, Text, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { Colors } from '@/constants/theme';
import { useCallContext } from '@/contexts/CallContext';
import { useCallStore } from '@/store/call.store';
import { IS_CALL_ENABLED } from '@/constants/runtime';
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
  onAskAi?: () => void;
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
  onAskAi,
}: ChatHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { initiateCall, initiateGroupCall } = useCallContext();
  const callStatus = useCallStore((s) => s.callStatus);

  const [memberPicker, setMemberPicker] = useState<{
    visible: boolean;
    callType: CallType;
  }>({ visible: false, callType: 'VOICE' });

  const [callSheetVisible, setCallSheetVisible] = useState(false);

  const showPrivateCallButtons = !isGroup && !!conversationId && !!receiverId;
  const showGroupCallButton = isGroup && !!conversationId;
  const callDisabled = callStatus !== 'IDLE';

  const showCallUnavailableAlert = () => {
    Alert.alert(
      'Call unavailable in Expo Go',
      'Calling is only available in a development build. Please build the app to use voice/video calls.',
    );
  };

  const subtitle = isGroup
    ? `${memberCount ?? 0} members`
    : isOnline
      ? 'Active now'
      : 'Offline';

  const handleStartGroupCall = (selectedMemberIds: string[]) => {
    if (!conversationId) return;
    initiateGroupCall(conversationId, memberPicker.callType, name, memberCount ?? 0, selectedMemberIds, avatarUrl);
    setMemberPicker({ visible: false, callType: 'VOICE' });
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

        {/* Ask AI button (group only) */}
        {isGroup && !!onAskAi && (
          <TouchableOpacity onPress={onAskAi} className="mx-1 p-2">
            <CustomAiIcon size={22} color={Colors.cta} />
          </TouchableOpacity>
        )}

        {/* Private call buttons */}
        {showPrivateCallButtons && (
          <>
            <TouchableOpacity
              className="mx-1 p-2"
              disabled={callDisabled}
              onPress={() => {
                if (!IS_CALL_ENABLED) {
                  showCallUnavailableAlert();
                  return;
                }
                initiateCall(receiverId!, conversationId!, 'VOICE', name, avatarUrl ?? null);
              }}
              style={{ opacity: callDisabled ? 0.4 : 1 }}
            >
              <Ionicons name="call-outline" size={22} color={Colors.cta} />
            </TouchableOpacity>
            <TouchableOpacity
              className="mx-1 p-2"
              disabled={callDisabled}
              onPress={() => {
                if (!IS_CALL_ENABLED) {
                  showCallUnavailableAlert();
                  return;
                }
                initiateCall(receiverId!, conversationId!, 'VIDEO', name, avatarUrl ?? null);
              }}
              style={{ opacity: callDisabled ? 0.4 : 1 }}
            >
              <Ionicons name="videocam-outline" size={24} color={Colors.cta} />
            </TouchableOpacity>
          </>
        )}

        {/* Group call — single button with chevron indicator */}
        {showGroupCallButton && (
          <TouchableOpacity
            className="mx-1"
            disabled={callDisabled}
            onPress={() => {
              if (!IS_CALL_ENABLED) {
                showCallUnavailableAlert();
                return;
              }
              setCallSheetVisible(true);
            }}
            style={{
              opacity: callDisabled ? 0.4 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 6,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="call-outline" size={22} color={Colors.cta} />
            <Ionicons name="chevron-down" size={12} color={Colors.cta} style={{ marginLeft: 1, marginTop: 2 }} />
          </TouchableOpacity>
        )}

        {onPressInfo && (
          <TouchableOpacity onPress={onPressInfo} className="mx-1 p-2">
            <Ionicons name="information-circle-outline" size={24} color={Colors.cta} />
          </TouchableOpacity>
        )}
      </View>

      {/* Group call type sheet */}
      <Modal
        visible={callSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCallSheetVisible(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay }}
          onPress={() => setCallSheetVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, paddingTop: 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 }}
            />
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 }}
              onPress={() => {
                setCallSheetVisible(false);
                setMemberPicker({ visible: true, callType: 'VOICE' });
              }}
            >
              <Ionicons name="call-outline" size={22} color={Colors.cta} style={{ marginRight: 16 }} />
              <Text style={{ fontSize: 16, color: Colors.text }}>Voice call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 }}
              onPress={() => {
                setCallSheetVisible(false);
                setMemberPicker({ visible: true, callType: 'VIDEO' });
              }}
            >
              <Ionicons name="videocam-outline" size={22} color={Colors.cta} style={{ marginRight: 16 }} />
              <Text style={{ fontSize: 16, color: Colors.text }}>Video call</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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


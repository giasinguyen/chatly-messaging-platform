import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useCallSocket } from '@/hooks/useCallSocket';
import { useCallStore } from '@/store/call.store';

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
  const { initiateCall } = useCallSocket();
  const callStatus = useCallStore((s) => s.callStatus);

  // Chỉ hiển thị nút gọi cho cuộc trò chuyện riêng tư
  const showCallButtons = !isGroup && !!conversationId && !!receiverId;
  const callDisabled = callStatus !== 'IDLE';

  const subtitle = isGroup
    ? `${memberCount ?? 0} members`
    : isOnline
      ? 'Active now'
      : 'Offline';

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
        {showCallButtons && (
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
        {!showCallButtons && (
          <>
            <TouchableOpacity className="mx-1 p-2">
              <Ionicons name="call-outline" size={22} color={Colors.cta} />
            </TouchableOpacity>
            <TouchableOpacity className="mx-1 p-2">
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
    </View>
  );
}

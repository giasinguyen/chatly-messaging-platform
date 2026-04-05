import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  memberCount?: number;
  isGroup?: boolean;
}

export function ChatHeader({
  name,
  avatarUrl,
  isOnline = false,
  memberCount,
  isGroup = false,
}: ChatHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const subtitle = isGroup
    ? `${memberCount ?? 0} thành viên`
    : isOnline
      ? 'Đang hoạt động'
      : 'Ngoại tuyến';

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

        {/* Action buttons */}
        <TouchableOpacity className="mx-1 p-2">
          <Ionicons name="call-outline" size={22} color={Colors.cta} />
        </TouchableOpacity>
        <TouchableOpacity className="mx-1 p-2">
          <Ionicons name="videocam-outline" size={24} color={Colors.cta} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

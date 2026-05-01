import { View, Text, Image, TouchableOpacity } from 'react-native';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { Colors } from '@/constants/theme';

interface CoAuthorAvatarProps {
  userAvatarUrl?: string | null;
  userDisplayName: string;
  size?: number;
  onPress?: () => void;
}

/**
 * Overlapping dual-avatar for AI co-authored messages.
 * Shows the sender avatar in front with the AI icon peeking behind.
 */
export function CoAuthorAvatar({ userAvatarUrl, userDisplayName, size = 28, onPress }: CoAuthorAvatarProps) {
  const offset = Math.round(size * 0.40);

  const inner = (
    <View style={{ width: size + offset, height: size }}>
      {/* AI badge behind */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.ctaLight ?? '#EEF2FF',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: Colors.white,
        }}
      >
        <CustomAiIcon size={Math.round(size * 0.6)} color={Colors.cta} />
      </View>

      {/* User avatar in front */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.cta,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: Colors.white,
        }}
      >
        {userAvatarUrl ? (
          <Image source={{ uri: userAvatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={{ fontSize: Math.round(size * 0.4), fontWeight: 'bold', color: 'white' }}>
            {(userDisplayName ?? '?').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

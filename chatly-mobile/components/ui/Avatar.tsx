import { View, Text, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import { getInitials } from '@/utils/format';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}

export function Avatar({ uri, name, size = 48, showOnline = false, isOnline = false }: AvatarProps) {
  const borderRadius = size * 0.38;
  const fontSize = size * 0.32;
  const statusSize = size * 0.26;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius,
            backgroundColor: Colors.ctaLight,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize,
              fontWeight: '600',
              color: Colors.cta,
            }}
          >
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnline && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: statusSize,
            height: statusSize,
            borderRadius: statusSize / 2,
            backgroundColor: isOnline ? Colors.online : Colors.offline,
            borderWidth: 2,
            borderColor: Colors.white,
          }}
        />
      )}
    </View>
  );
}

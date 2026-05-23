import { View, Text, Image } from 'react-native';
import { Colors } from '@/constants/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const LOGO = require('@/assets/logo/chatly-logo-transparent.png');

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const dimensions = {
    sm: 56,
    md: 88,
    lg: 120,
  };

  const textSize = {
    sm: 18,
    md: 26,
    lg: 34,
  };

  const dim = dimensions[size];

  return (
    <View className="items-center">
      <Image
        source={LOGO}
        style={{
          width: dim,
          height: dim,
          resizeMode: 'contain',
        }}
      />
      {showText && (
        <Text
          style={{
            fontSize: textSize[size],
            fontWeight: '800',
            color: Colors.text,
            letterSpacing: -0.5,
            marginTop: 8,
          }}
        >
          Chatly
        </Text>
      )}
    </View>
  );
}

import { View, Text, Image } from 'react-native';
import { Colors } from '@/constants/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const dimensions = {
    sm: 48,
    md: 72,
    lg: 96,
  };

  const textSize = {
    sm: 'text-xl' as const,
    md: 'text-3xl' as const,
    lg: 'text-4xl' as const,
  };

  const dim = dimensions[size];

  return (
    <View className="items-center">
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: dim * 0.28,
          backgroundColor: Colors.cta,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: Colors.cta,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text
          style={{
            color: Colors.white,
            fontSize: dim * 0.38,
            fontWeight: '700',
            letterSpacing: -0.5,
          }}
        >
          C
        </Text>
      </View>
      {showText && (
        <Text
          className={`${textSize[size]} mt-3 font-bold`}
          style={{ color: Colors.text, letterSpacing: -0.5 }}
        >
          Chatly
        </Text>
      )}
    </View>
  );
}

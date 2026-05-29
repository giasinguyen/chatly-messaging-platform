import { Image, View } from 'react-native';
import { useThemeStore } from '@/store/theme.store';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const LIGHT_LOGO = require('@/assets/logo/chatly-logo-nobg.png');
const DARK_LOGO = require('@/assets/logo/chatly-logo-white.png');

export function Logo({ size = 'md' }: LogoProps) {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const dimensions = {
    sm: { width: 132, height: 76 },
    md: { width: 176, height: 102 },
    lg: { width: 220, height: 128 },
  };

  return (
    <View className="items-center">
      <Image
        source={isDarkMode ? DARK_LOGO : LIGHT_LOGO}
        style={{
          width: dimensions[size].width,
          height: dimensions[size].height,
          resizeMode: 'contain',
        }}
      />
    </View>
  );
}

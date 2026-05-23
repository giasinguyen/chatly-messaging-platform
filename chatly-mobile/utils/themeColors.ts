import { Colors } from '@/constants/theme';

export function getThemeColors(isDarkMode: boolean) {
  if (!isDarkMode) {
    return {
      background: Colors.bg,
      card: Colors.white,
      text: Colors.text,
      textMuted: Colors.textMuted,
      textLight: Colors.textLight,
      border: Colors.borderLight,
      field: Colors.bg,
    };
  }

  return {
    background: '#0B0B0D',
    card: '#151518',
    text: '#F5F5F7',
    textMuted: '#C7C7CC',
    textLight: '#8E8E93',
    border: '#2C2C2E',
    field: '#1C1C1E',
  };
}

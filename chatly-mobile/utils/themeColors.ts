import { DarkColors, LightColors } from '@/constants/theme';

export function getThemeColors(isDarkMode: boolean) {
  if (!isDarkMode) {
    return {
      background: LightColors.bg,
      card: LightColors.white,
      text: LightColors.text,
      textMuted: LightColors.textMuted,
      textLight: LightColors.textLight,
      border: LightColors.borderLight,
      field: LightColors.bg,
    };
  }

  return {
    background: DarkColors.bg,
    card: DarkColors.bgCard,
    text: DarkColors.text,
    textMuted: DarkColors.textMuted,
    textLight: DarkColors.textLight,
    border: DarkColors.borderLight,
    field: DarkColors.bubbleReceiver,
  };
}

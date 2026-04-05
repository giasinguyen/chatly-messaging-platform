/**
 * Chatly Design Tokens
 * Apple-inspired design system adapted for React Native
 */

export const Colors = {
  // Primary
  bg: '#F5F5F7',
  bgCard: '#FFFFFF',
  bgDark: '#1D1D1F',
  text: '#1D1D1F',
  textMuted: '#6E6E73',
  textLight: '#AEAEB2',
  cta: '#0071E3',
  ctaHover: '#0077ED',
  ctaLight: '#E8F2FE',
  border: '#D2D2D7',
  borderLight: '#E5E5EA',

  // Status
  online: '#34C759',
  offline: '#8E8E93',
  away: '#FF9500',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',

  // Chat
  bubbleSender: '#0071E3',
  bubbleSenderText: '#FFFFFF',
  bubbleReceiver: '#F0F0F5',
  bubbleReceiverText: '#1D1D1F',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.4)',
  skeleton: '#E5E5EA',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
} as const;

export const FontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

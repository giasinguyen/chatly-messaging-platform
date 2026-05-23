import * as Device from 'expo-device';
import { Platform } from 'react-native';

let cached: string | undefined;

/** Short label for X-Device-Label (backend session / security). */
export function getMobileDeviceLabel(): string {
  if (cached) return cached;
  const readable = [Device.brand, Device.modelName].filter(Boolean).join(' ').trim();
  cached =
    readable ||
    (Platform.OS === 'ios'
      ? 'iOS'
      : Platform.OS === 'android'
        ? 'Android'
        : `${Platform.OS} device`);
  return cached;
}

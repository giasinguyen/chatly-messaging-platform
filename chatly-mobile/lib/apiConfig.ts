/**
 * Single source for API base URL (matches EXPO_PUBLIC_* at build time).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!raw || !String(raw).trim()) {
    return 'http://10.0.2.2:8080';
  }
  return String(raw).trim().replace(/\/+$/, '');
}

const DEFAULT_WEB_BASE_URL = 'https://chatly.io.vn';

export function getWebBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_WEB_BASE_URL || process.env.EXPO_PUBLIC_WEB_URL;
  if (!raw || !String(raw).trim()) {
    return DEFAULT_WEB_BASE_URL;
  }

  return String(raw).trim().replace(/\/+$/, '');
}

export function buildWebJoinLink(inviteToken: string): string {
  return `${getWebBaseUrl()}/join/${inviteToken}`;
}

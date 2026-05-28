import { Linking } from 'react-native';
import { router } from 'expo-router';

const URL_PROTOCOL_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;
const TRAILING_PUNCTUATION_REGEX = /[),.!?;:]+$/;

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(TRAILING_PUNCTUATION_REGEX, '');
  if (trimmed.startsWith('/') || URL_PROTOCOL_REGEX.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function extractJoinToken(rawUrl: string): string | null {
  const normalizedUrl = normalizeUrl(rawUrl);

  try {
    const parsedUrl = normalizedUrl.startsWith('/')
      ? new URL(normalizedUrl, 'chatly-mobile://internal')
      : new URL(normalizedUrl);

    if (parsedUrl.protocol === 'chatly-mobile:' && parsedUrl.hostname === 'join') {
      return parsedUrl.pathname.split('/').filter(Boolean)[0] ?? null;
    }

    const match = parsedUrl.pathname.match(/^\/join\/([^/?#]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function openAppAwareUrl(rawUrl: string): Promise<void> {
  const joinToken = extractJoinToken(rawUrl);

  if (joinToken) {
    router.push(`/join/${encodeURIComponent(joinToken)}`);
    return;
  }

  await Linking.openURL(normalizeUrl(rawUrl));
}

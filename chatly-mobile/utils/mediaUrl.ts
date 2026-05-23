import { getApiBaseUrl } from '@/lib/apiConfig';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

function replaceHostForDevice(url: URL): string {
  const base = new URL(getApiBaseUrl());
  if (!LOCAL_HOSTS.has(url.hostname)) {
    return url.toString();
  }

  return `${base.protocol}//${base.host}${url.pathname}${url.search}${url.hash}`;
}

export function normalizeMediaUrl(rawUrl: string | null | undefined): string | null {
  const candidate = rawUrl?.trim();
  if (!candidate) {
    return null;
  }

  try {
    if (candidate.startsWith('/')) {
      return `${getApiBaseUrl()}${candidate}`;
    }

    if (!candidate.includes('://')) {
      return `${getApiBaseUrl()}/${candidate.replace(/^\/+/, '')}`;
    }

    const parsed = new URL(candidate);
    return replaceHostForDevice(parsed);
  } catch {
    return null;
  }
}

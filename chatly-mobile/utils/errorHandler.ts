import { isAxiosError } from 'axios';
import type { ApiResponse } from '@/types/auth';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<ApiResponse<unknown>>(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Connection timed out. Please try again.';
    }
    return 'Could not connect to server. Please check your network.';
  }

  const code = error.response.data?.code;
  const serverMessage = error.response.data?.message;

  const codeMessages: Record<number, string> = {
    1104: 'Invalid credentials. Please check your email/phone or password.',
    1101: 'Account already exists.',
    1102: 'Email already in use.',
    1103: 'Phone number already in use.',
    1106: 'Username already in use.',
    1105: 'Password must be at least 6 characters.',
    1601: 'Session expired. Please log in again.',
    1602: 'Invalid or expired token.',
    1600: 'You do not have permission to perform this action.',
    9999: 'System error. Please try again later.',
  };

  if (code && codeMessages[code]) {
    return codeMessages[code];
  }

  return serverMessage || fallback;
}

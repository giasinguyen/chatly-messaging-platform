import i18n from '@/lib/i18n';

export function formatCompactCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

export function formatRelativeTime(createdAt: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diffMinutes < 1) return i18n.t('common.just_now');
  if (diffMinutes < 60) {
    return i18n.t('notifications.time_m_ago', { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return i18n.t('notifications.time_h_ago', { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  return i18n.t('notifications.time_d_ago', { count: diffDays });
}

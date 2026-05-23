import type { Reel } from '@/types/reel';

export function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

export function formatPrivacy(value: Reel['visibility']) {
  if (value === 'FRIENDS_ONLY') return 'Friends';
  if (value === 'ONLY_ME') return 'Only me';
  return 'Everyone';
}

export function getReactionCount(reel: Reel) {
  return reel.reactions?.reduce((total, reaction) => total + reaction.count, 0) ?? 0;
}

export function hasReacted(reel: Reel) {
  return reel.reactions?.some((reaction) => reaction.reactedByMe) ?? false;
}

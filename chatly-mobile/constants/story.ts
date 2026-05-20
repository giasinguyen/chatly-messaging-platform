import type { StoryPrivacy } from '@/types/story';

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const MAX_STORY_VIDEO_SIZE_MB = 5;
export const MAX_STORY_VIDEO_SIZE_BYTES = MAX_STORY_VIDEO_SIZE_MB * BYTES_PER_MEGABYTE;
export const DEFAULT_STORY_FONT_SIZE = 30;
export const MIN_STORY_FONT_SIZE = 22;
export const MAX_STORY_FONT_SIZE = 42;
export const STORY_FONT_SIZE_STEP = 4;

export const STORY_BACKGROUNDS = [
  { id: 0, label: 'Ocean', color: '#2563EB', accent: '#06B6D4' },
  { id: 1, label: 'Neon', color: '#A855F7', accent: '#EC4899' },
  { id: 2, label: 'Sunset', color: '#FB923C', accent: '#F43F5E' },
  { id: 3, label: 'Mint', color: '#34D399', accent: '#14B8A6' },
  { id: 4, label: 'Midnight', color: '#1E293B', accent: '#020617' },
  { id: 5, label: 'Gold', color: '#FACC15', accent: '#F97316' },
];

export const STORY_PRIVACY_OPTIONS: {
  value: StoryPrivacy;
  label: string;
  description: string;
  icon: 'earth-outline' | 'people-outline' | 'star-outline' | 'lock-closed-outline';
}[] = [
  {
    value: 'EVERYONE',
    label: 'Everyone',
    description: 'Anyone on Chatly',
    icon: 'earth-outline',
  },
  {
    value: 'FOLLOWERS_ONLY',
    label: 'Followers',
    description: 'People who follow you',
    icon: 'people-outline',
  },
  {
    value: 'CLOSE_FRIENDS',
    label: 'Close friends',
    description: 'A selected list',
    icon: 'star-outline',
  },
  {
    value: 'ONLY_ME',
    label: 'Only me',
    description: 'Visible only to you',
    icon: 'lock-closed-outline',
  },
];

export const STORY_MUSIC_CATEGORIES = [
  { id: 'chill', name: 'Chill' },
  { id: 'lofi', name: 'Lofi' },
  { id: 'hiphop', name: 'Hip Hop' },
  { id: 'rap', name: 'Rap' },
  { id: 'pop', name: 'Pop' },
  { id: 'acoustic', name: 'Acoustic' },
  { id: 'jazz', name: 'Jazz' },
  { id: 'electronic', name: 'EDM' },
  { id: 'rock', name: 'Rock' },
  { id: 'rnb', name: 'R&B' },
  { id: 'classical', name: 'Classic' },
  { id: 'reggae', name: 'Reggae' },
  { id: 'blues', name: 'Blues' },
  { id: 'country', name: 'Country' },
  { id: 'metal', name: 'Metal' },
  { id: 'ambient', name: 'Ambient' },
  { id: 'disco', name: 'Disco' },
  { id: 'funk', name: 'Funk' },
  { id: 'soul', name: 'Soul' },
  { id: 'techno', name: 'Techno' },
];

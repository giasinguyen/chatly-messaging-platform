export const HOME_FEED_PAGE_SIZE = 15;
export const HOME_FEED_END_REACHED_THRESHOLD = 0.45;
export const EXPLORE_FEED_PAGE_SIZE = 18;
export const EXPLORE_SEARCH_PAGE_SIZE = 18;
export const EXPLORE_SEARCH_DEBOUNCE_MS = 400;
export const EXPLORE_END_REACHED_THRESHOLD = 0.5;

export interface ExploreCategory {
  label: string;
  hashtag: string | null;
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  { label: 'For You', hashtag: null },
  { label: 'Trending', hashtag: 'trending' },
  { label: 'Photography', hashtag: 'photography' },
  { label: 'Digital Art', hashtag: 'digitalart' },
  { label: 'Travel', hashtag: 'travel' },
  { label: 'Architecture', hashtag: 'architecture' },
];

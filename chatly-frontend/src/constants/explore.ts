export interface ExploreCategory {
    id: string;
    labelKey: string;
    hashtag: string | null;
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
    { id: "for_you", labelKey: "explore.category.for_you", hashtag: null },
    { id: "trending", labelKey: "explore.category.trending", hashtag: "trending" },
    { id: "photography", labelKey: "explore.category.photography", hashtag: "photography" },
    { id: "digital_art", labelKey: "explore.category.digital_art", hashtag: "digitalart" },
    { id: "travel", labelKey: "explore.category.travel", hashtag: "travel" },
    { id: "architecture", labelKey: "explore.category.architecture", hashtag: "architecture" },
];

export const DEFAULT_EXPLORE_CATEGORY_ID = "for_you";

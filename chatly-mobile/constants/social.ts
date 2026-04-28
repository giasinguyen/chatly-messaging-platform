import type { ReactionType } from "@/types/post";

export interface ReactionConfig {
    type: ReactionType;
    emoji: string;
    label: string;
}

export const REACTION_EMOJIS: ReactionConfig[] = [
    { type: "LIKE", emoji: "👍", label: "Like" },
    { type: "LOVE", emoji: "❤️", label: "Love" },
    { type: "HAHA", emoji: "😂", label: "Haha" },
    { type: "WOW", emoji: "😮", label: "Wow" },
    { type: "SAD", emoji: "😢", label: "Sad" },
    { type: "ANGRY", emoji: "😡", label: "Angry" },
];

export const REACTION_PICKER_LONG_PRESS_MS = 400;

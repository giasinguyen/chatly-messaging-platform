import type { Post } from "@/types/post";

export const SAMPLE_FEED_POSTS: Post[] = [
    {
        id: "sample-post-1",
        authorId: "lucy.park",
        authorDisplayName: "Lucy Park",
        authorAvatarUrl:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&w=96&h=96&q=80",
        savedByMe: false,
        content:
            "Morning light, clean desk, and a fresh prototype. Shipping tiny wins feels great.",
        mediaUrls: [
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
        ],
        visibility: "PUBLIC",
        hashtags: ["design", "prototype"],
        reactions: [
            { type: "LIKE", count: 24, reactedByMe: false },
            { type: "LOVE", count: 7, reactedByMe: false },
        ],
        commentCount: 6,
        shareCount: 2,
        createdAt: "2026-04-30T08:30:00Z",
        updatedAt: "2026-04-30T08:30:00Z",
    },
    {
        id: "sample-post-2",
        authorId: "devon.lee",
        authorDisplayName: "Devon Lee",
        authorAvatarUrl:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&w=96&h=96&q=80",
        savedByMe: false,
        content:
            "Weekend trail run before the sprint planning. Battery fully recharged.",
        mediaUrls: [
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        ],
        visibility: "PUBLIC",
        hashtags: ["weekend", "outdoors"],
        reactions: [{ type: "WOW", count: 12, reactedByMe: false }],
        commentCount: 3,
        shareCount: 1,
        createdAt: "2026-04-29T19:10:00Z",
        updatedAt: "2026-04-29T19:10:00Z",
    },
];

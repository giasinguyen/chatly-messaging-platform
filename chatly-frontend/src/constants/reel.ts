export const REEL_FEED_PAGE_SIZE = 8;
export const DEFAULT_REEL_MAX_VIDEO_SIZE_MB = 20;
export const REEL_MAX_VIDEO_SIZE_MB = Number(
    import.meta.env.VITE_REEL_MAX_VIDEO_SIZE_MB ?? DEFAULT_REEL_MAX_VIDEO_SIZE_MB,
);
export const REEL_MAX_VIDEO_SIZE_BYTES = REEL_MAX_VIDEO_SIZE_MB * 1024 * 1024;
export const REEL_ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/3gpp",
];

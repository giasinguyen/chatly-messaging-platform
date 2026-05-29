export interface YouTubePreview {
    videoId: string;
    thumbnailUrl: string;
}

const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
]);

const YOUTUBE_PATH_VIDEO_TYPES = new Set(["shorts", "embed", "live"]);
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{6,}$/;

export function getYouTubePreview(url: string): YouTubePreview | null {
    try {
        const parsedUrl = new URL(url);
        const host = parsedUrl.hostname.toLowerCase();
        if (!YOUTUBE_HOSTS.has(host)) {
            return null;
        }

        let videoId: string | null = null;
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

        if (host === "youtu.be") {
            videoId = pathParts[0] ?? null;
        } else if (parsedUrl.pathname === "/watch") {
            videoId = parsedUrl.searchParams.get("v");
        } else if (YOUTUBE_PATH_VIDEO_TYPES.has(pathParts[0] ?? "")) {
            videoId = pathParts[1] ?? null;
        }

        if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
            return null;
        }

        return {
            videoId,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
    } catch {
        return null;
    }
}

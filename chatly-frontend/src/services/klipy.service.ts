/**
 * KLIPY API Service
 * -----------------
 * Fetch helpers for GIFs, Stickers, Categories, and Share tracking.
 *
 * Setup:
 *   1. Add VITE_KLIPY_API_KEY=<your_key> to .env
 *   2. Vite proxy: /klipy-api → https://api.klipy.com (see vite.config.ts)
 */

const BASE = "/klipy-api";
const APP_KEY = import.meta.env.VITE_KLIPY_API_KEY;

// ─── TTL Cache ───────────────────────────────────────────────────────────────

interface CacheEntry<T> {
    data: T;
    expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const TTL = {
    TRENDING: 5 * 60 * 1000,   // 5 minutes
    CATEGORIES: 30 * 60 * 1000, // 30 minutes
    SEARCH: 2 * 60 * 1000,      // 2 minutes
} as const;

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number): void {
    cache.set(key, { data, expiry: Date.now() + ttl });
}

async function cachedGet<T>(cacheKey: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    const hit = getCached<T>(cacheKey);
    if (hit !== null) return hit;
    const data = await fetcher();
    setCache(cacheKey, data, ttl);
    return data;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KlipyFileVariant {
    url: string;
    width: number;
    height: number;
    size: number;
}

export interface KlipyFileSize {
    gif?: KlipyFileVariant;
    webp?: KlipyFileVariant;
    mp4?: KlipyFileVariant;
    webm?: KlipyFileVariant;
    jpg?: KlipyFileVariant;
    png?: KlipyFileVariant;
}

export interface KlipyItem {
    id: number;
    slug: string;
    title: string;
    type: "gif" | "sticker";
    tags: string[];
    blur_preview?: string;
    file: {
        hd: KlipyFileSize;
        md: KlipyFileSize;
        sm: KlipyFileSize;
        xs: KlipyFileSize;
    };
}

export interface KlipyCategory {
    category: string;
    query: string;
    preview_url: string;
}

export interface KlipyListResult {
    items: KlipyItem[];
    hasNext: boolean;
}

/** Raw response envelope returned by every KLIPY list / category endpoint */
interface KlipyApiResponse {
    data: {
        data?: KlipyItem[];
        has_next?: boolean;
        categories?: KlipyCategory[];
    };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`KLIPY API error: ${res.status}`);
    return res.json();
}

// ─── GIFs ────────────────────────────────────────────────────────────────────

export async function fetchGifTrending(page = 1, customerId: string): Promise<KlipyListResult> {
    return cachedGet(`gif-trending:${page}:${customerId}`, TTL.TRENDING, async () => {
        const d = await get<KlipyApiResponse>(
            `/api/v1/${APP_KEY}/gifs/trending?page=${page}&per_page=24&customer_id=${encodeURIComponent(customerId)}`,
        );
        return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
    });
}

export async function searchGifs(query: string, page = 1, customerId: string): Promise<KlipyListResult> {
    return cachedGet(`gif-search:${query}:${page}:${customerId}`, TTL.SEARCH, async () => {
        const d = await get<KlipyApiResponse>(
            `/api/v1/${APP_KEY}/gifs/search?q=${encodeURIComponent(query)}&page=${page}&per_page=24&customer_id=${encodeURIComponent(customerId)}`,
        );
        return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
    });
}

export async function fetchGifCategories(): Promise<KlipyCategory[]> {
    return cachedGet("gif-categories", TTL.CATEGORIES, async () => {
        const d = await get<KlipyApiResponse>(`/api/v1/${APP_KEY}/gifs/categories`);
        return d.data?.categories ?? [];
    });
}

// ─── Stickers ────────────────────────────────────────────────────────────────

export async function fetchStickerTrending(page = 1, customerId: string): Promise<KlipyListResult> {
    return cachedGet(`sticker-trending:${page}:${customerId}`, TTL.TRENDING, async () => {
        const d = await get<KlipyApiResponse>(
            `/api/v1/${APP_KEY}/stickers/trending?page=${page}&per_page=24&customer_id=${encodeURIComponent(customerId)}`,
        );
        return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
    });
}

export async function searchStickers(query: string, page = 1, customerId: string): Promise<KlipyListResult> {
    return cachedGet(`sticker-search:${query}:${page}:${customerId}`, TTL.SEARCH, async () => {
        const d = await get<KlipyApiResponse>(
            `/api/v1/${APP_KEY}/stickers/search?q=${encodeURIComponent(query)}&page=${page}&per_page=24&customer_id=${encodeURIComponent(customerId)}`,
        );
        return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
    });
}

export async function fetchStickerCategories(): Promise<KlipyCategory[]> {
    return cachedGet("sticker-categories", TTL.CATEGORIES, async () => {
        const d = await get<KlipyApiResponse>(`/api/v1/${APP_KEY}/stickers/categories`);
        return d.data?.categories ?? [];
    });
}

// ─── Share Tracking (REQUIRED — call on every user selection) ────────────────

export async function triggerShare(contentType: "gif" | "sticker", slug: string, customerId: string, q = ""): Promise<void> {
    try {
        await fetch(`${BASE}/api/v1/${APP_KEY}/${contentType}s/share/${slug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customer_id: customerId, q }),
        });
    } catch {
        // Non-critical — share tracking failure should not block the user
    }
}

// ─── URL Helpers ─────────────────────────────────────────────────────────────

/** Best URL for displaying a media item thumbnail inside the picker grid */
export function getThumbUrl(item: KlipyItem): string {
    return (
        item.file?.sm?.webp?.url ||
        item.file?.sm?.gif?.url ||
        item.file?.xs?.webp?.url ||
        item.file?.xs?.gif?.url ||
        ""
    );
}

/** Best URL for rendering the item in a chat message bubble */
export function getDisplayUrl(item: KlipyItem): string {
    if (item.type === "sticker") {
        return (
            item.file?.md?.webp?.url ||
            item.file?.md?.gif?.url ||
            item.file?.sm?.webp?.url ||
            item.file?.sm?.gif?.url ||
            ""
        );
    }
    // GIF
    return (
        item.file?.md?.webp?.url ||
        item.file?.md?.gif?.url ||
        item.file?.sm?.gif?.url ||
        ""
    );
}

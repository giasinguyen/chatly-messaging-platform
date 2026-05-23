/**
 * KLIPY API Module
 * ----------------
 * Provides fetch helpers for GIFs, Stickers, Categories, and Share tracking.
 *
 * Setup:
 *   1. Add VITE_KLIPY_API_KEY=<your_key> to .env
 *   2. Configure a dev proxy so /klipy-api → https://api.klipy.com (see SKILL.md Step 2)
 *   3. Replace CUSTOMER_ID with a stable per-user identifier (UUID, hashed ID, etc.)
 */

const BASE = '/klipy-api';
const APP_KEY = import.meta.env.VITE_KLIPY_API_KEY;
// Replace with a stable unique identifier per user — must NOT change across sessions.
const CUSTOMER_ID = 'user-001';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`KLIPY API error: ${res.status}`);
  return res.json();
}

// ─── GIFs ────────────────────────────────────────────────────────────────────

export async function fetchGifTrending(page = 1) {
  const d = await get(
    `/api/v1/${APP_KEY}/gifs/trending?page=${page}&per_page=24&customer_id=${CUSTOMER_ID}`
  );
  return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
}

export async function searchGifs(query, page = 1) {
  const d = await get(
    `/api/v1/${APP_KEY}/gifs/search?q=${encodeURIComponent(query)}&page=${page}&per_page=24&customer_id=${CUSTOMER_ID}`
  );
  return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
}

export async function fetchGifCategories() {
  const d = await get(`/api/v1/${APP_KEY}/gifs/categories`);
  return d.data?.categories ?? [];
}

// ─── Stickers ────────────────────────────────────────────────────────────────

export async function fetchStickerTrending(page = 1) {
  const d = await get(
    `/api/v1/${APP_KEY}/stickers/trending?page=${page}&per_page=24&customer_id=${CUSTOMER_ID}`
  );
  return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
}

export async function searchStickers(query, page = 1) {
  const d = await get(
    `/api/v1/${APP_KEY}/stickers/search?q=${encodeURIComponent(query)}&page=${page}&per_page=24&customer_id=${CUSTOMER_ID}`
  );
  return { items: d.data?.data ?? [], hasNext: d.data?.has_next ?? false };
}

export async function fetchStickerCategories() {
  const d = await get(`/api/v1/${APP_KEY}/stickers/categories`);
  return d.data?.categories ?? [];
}

// ─── Share Tracking (REQUIRED — call on every user selection) ─────────────────

export async function triggerShare(contentType, slug, q = '') {
  try {
    await fetch(`${BASE}/api/v1/${APP_KEY}/${contentType}s/share/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: CUSTOMER_ID, q }),
    });
  } catch {
    // Non-critical — share tracking failure should not block the user
  }
}

// ─── URL Helpers ──────────────────────────────────────────────────────────────

/** Best URL for displaying a media item thumbnail inside the picker grid */
export function getThumbUrl(item) {
  return (
    item.file?.sm?.webp?.url ||
    item.file?.sm?.gif?.url ||
    item.file?.xs?.webp?.url ||
    item.file?.xs?.gif?.url ||
    ''
  );
}

/** Best URL for rendering the item in a chat message bubble */
export function getDisplayUrl(item) {
  if (item.type === 'sticker') {
    return (
      item.file?.md?.gif?.url ||
      item.file?.md?.webp?.url ||
      item.file?.sm?.gif?.url ||
      ''
    );
  }
  // GIF
  return (
    item.file?.md?.webp?.url ||
    item.file?.md?.gif?.url ||
    item.file?.sm?.gif?.url ||
    ''
  );
}

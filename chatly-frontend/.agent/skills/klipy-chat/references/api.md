# KLIPY API Reference

**Base URL**: `https://api.klipy.com`  
**Auth**: API key in path (`{app_key}`), not headers  
**Rate limit (testing)**: 100 req/min

---

## GIF Endpoints

### Trending GIFs
```
GET /api/v1/{app_key}/gifs/trending
  ?page=1          (default: 1, min: 1)
  &per_page=24     (default: 24, max: 50)
  &customer_id=    (REQUIRED — stable user identifier, e.g. UUID)
  &locale=en       (ISO 3166 alpha-2 country code, e.g. us, vn, gb)
  &format_filter=  (comma-sep: gif,webp,jpg,mp4,webm)
```

### Search GIFs
```
GET /api/v1/{app_key}/gifs/search
  ?q=              (search keyword)
  &page=1
  &per_page=24     (min: 8, max: 50)
  &customer_id=    (REQUIRED)
  &locale=
  &content_filter= (off | low | medium | high)
  &format_filter=
```

### GIF Categories
```
GET /api/v1/{app_key}/gifs/categories
  ?locale=en_US    (format: xx_YY)
```

### Share Trigger (REQUIRED on selection)
```
POST /api/v1/{app_key}/gifs/share/{slug}
Body: { "customer_id": "...", "q": "search_query_or_empty" }
```

---

## Sticker Endpoints

Same pattern as GIFs — swap `/gifs/` for `/stickers/`:

```
GET  /api/v1/{app_key}/stickers/trending
GET  /api/v1/{app_key}/stickers/search
GET  /api/v1/{app_key}/stickers/categories
POST /api/v1/{app_key}/stickers/share/{slug}
```

---

## Response Shape

All list endpoints return:
```json
{
  "result": true,
  "data": {
    "data": [ /* array of items */ ],
    "current_page": 1,
    "per_page": 24,
    "has_next": true
  }
}
```

### Item Object
```json
{
  "id": 8041071659142944,
  "slug": "hello-hi-662",
  "title": "Hello",
  "type": "gif",
  "tags": [],
  "blur_preview": "data:image/jpeg;base64,...",
  "file": {
    "hd": { "gif": { "url": "...", "width": 498, "height": 498, "size": 4001918 }, "webp": {...}, "mp4": {...}, "webm": {...}, "jpg": {...} },
    "md": { "gif": {...}, "webp": {...}, "mp4": {...}, "webm": {...}, "jpg": {...} },
    "sm": { "gif": {...}, "webp": {...}, "mp4": {...}, "webm": {...}, "jpg": {...} },
    "xs": { "gif": {...}, "webp": {...}, "mp4": {...}, "webm": {...}, "jpg": {...} }
  }
}
```

Sticker items also include `"png"` format at each size (transparent background).

### Categories Response
```json
{
  "result": true,
  "data": {
    "locale": "en_US",
    "categories": [
      { "category": "smile", "query": "smile", "preview_url": "https://..." }
    ]
  }
}
```

---

## File Size Reference

| Size | GIF mean KB | WebP mean KB | Notes |
|------|-------------|--------------|-------|
| `hd` | 3874 | 755 | Too large for grid |
| `md` | 2263 | 988 | Good for chat display |
| `sm` | 330  | 178 | **Best for grid thumbnails** |
| `xs` | 101  | 51  | Micro thumbnails |

**Recommendation**:
- Grid thumbnail → `sm.webp` → `sm.gif` → `xs.webp`
- Chat bubble → `md.webp` → `md.gif`
- Sticker chat bubble → `md.gif` → `md.png`

---

## CORS

The API does not allow direct browser requests without a proxy. Always configure a reverse proxy:

- **Vite**: server.proxy in `vite.config.js`
- **Next.js**: `rewrites()` in `next.config.js`
- **Express**: `http-proxy-middleware`

---

## Attribution Requirements

Per KLIPY API Usage Guidelines:
1. Search input placeholder **must** be `"Search KLIPY"` — REQUIRED
2. Display `"Powered by KLIPY"` in the picker UI — STRONGLY RECOMMENDED
3. Call `POST .../share/{slug}` on every user selection — for analytics & personalization

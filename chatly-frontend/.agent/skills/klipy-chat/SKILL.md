---
name: klipy-chat
description: "Integrate KLIPY GIF and Sticker picker into any React chat application. Use when: adding GIF tab, sticker picker, emoji panel, media dialog, KLIPY API integration, chat gif support, sticker feature, messaging GIF, animated sticker. Produces a ready-to-use MediaPicker component with search, categories, trending, infinite scroll, and attribution — matching the UX quality of Zalo and Messenger."
argument-hint: "framework (react/vue/vanilla) or feature scope (gif-only, sticker-only, both)"
---

# KLIPY Chat Integration Skill

Installs a fully functional **GIF + Sticker picker** dialog into any chat UI using the KLIPY API. Ships with search, category filtering, trending content, infinite scroll, share tracking, and required attribution.

## When to Use

- Adding GIF / Sticker button to a chat input bar
- Building a media content picker dialog (like Zalo, Messenger, Telegram)
- Integrating KLIPY API (`api.klipy.com`) into a web application
- Migrating from Tenor / Giphy to KLIPY
- Any request that mentions: `GIF picker`, `sticker panel`, `KLIPY`, `media dialog`, `chat emoji`

## Resources

| File | Purpose |
|------|---------|
| [API Reference](./references/api.md) | All endpoints, params, response shapes |
| [MediaPicker Template](./assets/MediaPicker.jsx) | Drop-in React component |
| [API Module Template](./assets/klipy.js) | Fetch helpers for all content types |
| [CSS Template](./assets/mediapicker.css) | Messenger-style styles, copy or adapt |

---

## Integration Procedure

### Step 1 — Gather Context

Before writing code, determine:

1. **Framework**: React (default assumed) / Vue / Vanilla JS
2. **Existing project structure**: Where components, utilities, styles live
3. **API key location**: `.env` file, `VITE_KLIPY_API_KEY` or similar
4. **Content scope**: GIF only, Sticker only, or both (default: both)
5. **CORS handling**: If browser-to-API, a proxy is needed (Vite, Next.js, etc.)

### Step 2 — Set Up Environment

Add to `.env` (Vite):
```
VITE_KLIPY_API_KEY=your_api_key_here
```

For **Vite**, add proxy in `vite.config.js` to avoid CORS:
```js
server: {
  proxy: {
    '/klipy-api': {
      target: 'https://api.klipy.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/klipy-api/, ''),
    },
  },
},
```

For **Next.js**, add to `next.config.js`:
```js
async rewrites() {
  return [{ source: '/klipy-api/:path*', destination: 'https://api.klipy.com/:path*' }];
}
```

### Step 3 — Copy API Module

Copy [klipy.js](./assets/klipy.js) to `src/api/klipy.js` (or equivalent).

Key functions:
- `fetchGifTrending(page)` — Trending GIFs
- `searchGifs(query, page)` — GIF search
- `fetchStickerTrending(page)` — Trending Stickers
- `searchStickers(query, page)` — Sticker search
- `fetchGifCategories()` / `fetchStickerCategories()` — Category chips
- `triggerShare(contentType, slug, q)` — Required share tracking
- `getThumbUrl(item)` → URL for grid thumbnail
- `getDisplayUrl(item)` → URL for chat message display

**IMPORTANT**: Always call `triggerShare()` when a user selects and sends content. This is required for KLIPY analytics.

### Step 4 — Copy MediaPicker Component

Copy [MediaPicker.jsx](./assets/MediaPicker.jsx) to `src/components/MediaPicker.jsx`.

Props:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialTab` | `'gif'` \| `'sticker'` | `'gif'` | Which tab opens first |
| `onSelect` | `(item) => void` | required | Called when user picks an item |
| `onClose` | `() => void` | required | Called when user closes picker |

The `item` object returned by `onSelect`:
```js
{
  id: number,
  slug: string,       // use for share tracking
  title: string,
  type: 'gif' | 'sticker',
  file: { hd, md, sm, xs }  // each has gif/webp/mp4/png URLs
}
```

### Step 5 — Add Styles

- Copy [mediapicker.css](./assets/mediapicker.css) and import it, OR
- Adapt the class names to your existing design system (Tailwind, MUI, etc.)

Key class names that must exist:
```
.media-picker       — outer container (flex column, fixed height)
.picker-header      — tab row
.picker-tab         — each tab button (.active state)
.media-grid         — CSS grid for items
.media-grid--gif    — 3 columns, grid-auto-rows: 90px
.media-grid--sticker — 4 columns, grid-auto-rows: 90px
.media-item         — individual item button (position: relative, height: 90px)
.klipy-attribution  — "Powered by KLIPY" footer (REQUIRED)
```

### Step 6 — Wire Into Chat UI

Minimal integration in chat input bar:
```jsx
const [activePicker, setActivePicker] = useState(null); // 'gif' | 'sticker' | null

// In JSX:
{activePicker && (
  <MediaPicker
    initialTab={activePicker}
    onSelect={(item) => {
      // Add to messages as type: item.type, content: item
      setMessages(prev => [...prev, { type: item.type, content: item, sender: 'me' }]);
      setActivePicker(null);
    }}
    onClose={() => setActivePicker(null)}
  />
)}

// Buttons:
<button onClick={() => setActivePicker(p => p === 'gif' ? null : 'gif')}>GIF</button>
<button onClick={() => setActivePicker(p => p === 'sticker' ? null : 'sticker')}>😊</button>
```

### Step 7 — Render Media Messages

In the message list:
```jsx
if (msg.type === 'gif') {
  return <img src={getDisplayUrl(msg.content)} alt={msg.content.title} className="msg-gif" />;
}
if (msg.type === 'sticker') {
  return <img src={getDisplayUrl(msg.content)} alt={msg.content.title} className="msg-sticker-img" />;
}
```

Recommended sizes in CSS:
```css
.msg-gif       { max-width: 240px; max-height: 200px; border-radius: 14px; }
.msg-sticker-img { width: 140px; height: auto; }
```

---

## Attribution Requirements (REQUIRED)

Per KLIPY's API Usage Guidelines:
1. **Search placeholder must be `"Search KLIPY"`** — already hardcoded in the template
2. **"Powered by KLIPY"** shown in the picker footer — already in template
3. Share tracking via `triggerShare()` on every selection

---

## Response Shape Reference

See [API Reference](./references/api.md) for full endpoint docs and response shapes.

Quick file URL access pattern:
```js
item.file.md.webp?.url  // Best quality for grid/display (webp preferred)
item.file.md.gif?.url   // Fallback
item.file.sm.gif?.url   // Thumbnail for grid
item.file.xs.gif?.url   // Micro thumbnail
// Stickers also have: item.file.md.png?.url (static preview)
```

---

## Checklist Before Done

- [ ] `.env` has `VITE_KLIPY_API_KEY` (or equivalent)
- [ ] Vite/Next.js proxy configured for CORS
- [ ] `klipy.js` API module added with correct `BASE` path
- [ ] `MediaPicker` component added with correct styles
- [ ] Picker opens/closes when GIF/Sticker buttons are toggled
- [ ] Selected item correctly appended to messages
- [ ] `triggerShare()` called on selection
- [ ] `"Search KLIPY"` placeholder in search input
- [ ] `"Powered by KLIPY"` attribution visible in picker footer
- [ ] GIF/Sticker messages render correctly in chat

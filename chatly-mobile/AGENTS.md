# AGENTS.md — chatly-mobile

> **Scope:** Expo 54 + React Native mobile client.
> Read this file before making any change to `chatly-mobile/`.

---

## 1. Tech Stack (do not upgrade without team discussion)

| Layer | Technology |
|---|---|
| Framework | Expo 54 + React Native 0.81 |
| Language | TypeScript 5 |
| Routing | Expo Router v6 (file-based) |
| Styling | NativeWind (Tailwind for RN) |
| State | Zustand |
| HTTP | Axios |
| WebSocket | @stomp/stompjs |
| Media | expo-image, expo-av, expo-image-picker |
| Notifications | expo-notifications |
| Video calls | react-native-webrtc |
| Animations | react-native-reanimated 4 |

---

## 2. Project Layout — where things live

```
app/
├── (auth)/             Auth screens — login, register (Expo Router group)
├── (app)/              Main app screens — chat, profile, settings
│   ├── _layout.tsx     Tab/Stack navigator for authenticated area
│   ├── index.tsx       Conversation list (home)
│   └── chat/
│       └── [id].tsx    Dynamic chat screen
├── _layout.tsx         Root layout — providers, splash screen
└── +not-found.tsx      404 fallback

src/                    (non-route code — same structure as frontend)
├── components/
├── services/
├── hooks/
├── store/
└── types/
```

**Rules:**
- Only screen/page files live inside `app/` — no business logic, no raw UI primitives.
- Shared components, hooks, stores go under `src/` — not inside `app/`.
- Dynamic route segments use `[id].tsx` convention.

---

## 3. Component Rules

### Size limit — hard rule
**A component file must not exceed 300 lines.**
Mobile components accumulate native-specific logic fast — this limit is even more important than on web.

Split strategy:
1. Extract sub-components into a `components/` subfolder next to the screen.
2. Extract gesture/animation logic into `use{Name}Gesture.ts` hooks.
3. Extract business logic into `use{Name}.ts` hooks.

### Platform-specific code
- Use `.ios.tsx` / `.android.tsx` file extensions only for genuinely irreconcilable platform differences.
- For minor differences, use `Platform.OS` checks inline — but extract to a helper if used in 3+ places.

---

## 4. Naming Conventions

Same as `chatly-frontend` — see those rules. Additional mobile-specific:

| Artifact | Convention | Example |
|---|---|---|
| Screen components | PascalCase + `Screen` suffix | `ChatScreen.tsx` |
| Native-specific hooks | `useNative` prefix | `useNativeNotification.ts` |
| Platform files | `.ios.tsx` / `.android.tsx` | `CameraButton.ios.tsx` |

**Language rule:** All code, comments, variable names **must be in English**.
Vietnamese is only acceptable in user-visible UI string literals inside the `vi` i18n locale file.

---

## 5. TypeScript Rules

Identical to `chatly-frontend`:
- No `any`. No unsafe `as X` casts without a comment.
- `"strict": true` in `tsconfig.json`.
- All API response shapes in `src/types/`.
- `interface` for objects, `type` for unions.

---

## 6. State Management

Same Zustand rules as `chatly-frontend`. Stores are **not shared** between mobile and frontend codebases — each app maintains its own stores with the same domain structure.

---

## 7. Styling — NativeWind

- Use NativeWind Tailwind classes as the primary styling mechanism.
- Do not use inline `style={{ }}` objects unless NativeWind cannot achieve the effect.
- Dark/light theme via NativeWind's `dark:` variant — not conditional class strings.
- Test layouts on both Android and iOS before committing any screen.

---

## 8. Navigation (Expo Router)

- All navigation uses Expo Router's `<Link>` or `router.push()` — never React Navigation's `navigate` directly unless wrapping a library that requires it.
- Pass minimal data via route params (IDs only) — load full data from store or API on the destination screen.
- Guards (auth redirect) live in `app/_layout.tsx` — not scattered inside individual screens.

---

## 9. Notifications & Permissions

- Always request permissions before accessing camera, microphone, notifications, or media library.
- Store permission status in a dedicated Zustand store (`usePermissionStore`) — do not re-request on every mount.
- Handle the case where the user has permanently denied a permission — show a prompt to open Settings.

---

## 10. WebRTC (react-native-webrtc)

- All WebRTC logic is isolated in `src/hooks/useWebRTC.ts`.
- Clean up peer connections and media streams in the hook's cleanup function — memory leaks here crash the app.
- Do not initialize WebRTC until the user explicitly starts a call.

---

## 11. Performance Rules

- Do not render lists with `.map()` in JSX — use `FlatList` or `FlashList` for any list that can have more than ~20 items.
- Images must use `expo-image` (not `Image` from React Native) — it handles caching automatically.
- Avoid anonymous functions in JSX props for frequently re-rendered components — use `useCallback`.

---

## 12. Checklist before committing

- [ ] No component file exceeds 300 lines
- [ ] No `any` types introduced
- [ ] No inline `style={{ }}` objects (use NativeWind classes)
- [ ] Tested on both Android and iOS simulators
- [ ] Permissions handled gracefully (denial case covered)
- [ ] `npm run lint` passes
- [ ] English-only identifiers and comments
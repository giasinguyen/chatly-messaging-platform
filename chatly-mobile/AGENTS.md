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
| Media | expo-image, expo-audio, expo-video, expo-image-picker |
| Notifications | expo-notifications |
| Video calls | react-native-webrtc |
| Animations | react-native-reanimated 4 |

---

## 2. Project Layout — where things live

```
app/
├── (auth)/             Auth screens — login, register (Expo Router group)
├── (tabs)/             Main tab screens — chat list, contacts, settings
├── assistant/          AI assistant screens
├── chat/               Chat screens
│   └── [id].tsx        Dynamic chat screen
├── profile/            Profile screens
├── _layout.tsx         Root layout — providers, splash screen
├── index.tsx           Entry redirect
├── notifications.tsx   Notification management
├── sessions.tsx        Session management
└── +not-found.tsx      404 fallback

components/             Shared UI components
├── chat/               Chat-specific components
├── call/               Call-related components
├── assistant/          AI assistant components
└── ui/                 Primitive UI components (Button, Input, etc.)

services/               Axios API calls — one file per domain
hooks/                  Custom hooks
store/                  Zustand stores — one file per domain
types/                  TypeScript type definitions
constants/              Shared constants
utils/                  Pure utility functions
```

**Rules:**
- Only screen/page files live inside `app/` — no business logic, no raw UI primitives.
- Shared components, hooks, stores go under their top-level folders — not inside `app/`.
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
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Event handlers | `handle` prefix | `handleSend`, `handlePress` |
| Boolean variables | `is/has/can/should` prefix | `isLoading`, `hasPermission` |

**Language rule:** All code, comments, variable names **must be in English**.
Vietnamese is only acceptable in user-visible UI string literals inside the `vi` i18n locale file.

---

## 5. TypeScript Rules

Identical to `chatly-frontend`:
- No `any`. No unsafe `as X` casts without a comment.
- `"strict": true` in `tsconfig.json`.
- All API response shapes in `types/`.
- `interface` for objects, `type` for unions.
- Always use `catch (error: unknown)` — never `catch (error: any)`.

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

- All WebRTC logic is isolated in `hooks/useWebRTC.ts` and `contexts/CallContext.tsx`.
- Clean up peer connections and media streams in the hook's cleanup function — memory leaks here crash the app.
- Do not initialize WebRTC until the user explicitly starts a call.

---

## 11. Performance Rules

- Do not render lists with `.map()` in JSX — use `FlatList` or `FlashList` for any list that can have more than ~20 items.
- Images must use `expo-image` (not `Image` from React Native) — it handles caching automatically.
- Avoid anonymous functions in JSX props for frequently re-rendered components — use `useCallback`.

---

## 12. Code Templates — Canonical Patterns

> AI agents and developers **must** follow these exact patterns when generating new code.

### 12.1 Screen Component Template

```tsx
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function FooScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, fetchItem, isLoading } = useFooStore();

  useEffect(() => {
    if (id) fetchItem(id);
  }, [id, fetchItem]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-background p-4">
      <Text className="text-xl font-bold text-foreground">{item?.name}</Text>
    </View>
  );
}
```

### 12.2 Reusable Component Template

```tsx
import { View, Text, Pressable } from "react-native";

interface FooCardProps {
  item: FooItem;
  onPress?: (id: string) => void;
}

export default function FooCard({ item, onPress }: FooCardProps) {
  const handlePress = () => {
    onPress?.(item.id);
  };

  return (
    <Pressable
      className="rounded-lg border border-border p-4 active:opacity-70"
      onPress={handlePress}
    >
      <Text className="font-medium text-foreground">{item.name}</Text>
      <Text className="text-sm text-muted-foreground">{item.description}</Text>
    </Pressable>
  );
}
```

### 12.3 API Service Template

```tsx
import axiosInstance from "@/lib/axiosInstance";
import { ApiResponse } from "@/types/api";
import { FooItem, CreateFooRequest } from "@/types/foo";

export const fooService = {
  getAll: async (): Promise<ApiResponse<FooItem[]>> => {
    const response = await axiosInstance.get("/api/foos");
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<FooItem>> => {
    const response = await axiosInstance.get(`/api/foos/${id}`);
    return response.data;
  },

  create: async (data: CreateFooRequest): Promise<ApiResponse<FooItem>> => {
    const response = await axiosInstance.post("/api/foos", data);
    return response.data;
  },
};
```

### 12.4 Zustand Store Template

```tsx
import { create } from "zustand";
import { FooItem } from "@/types/foo";
import { fooService } from "@/services/fooService";

interface FooState {
  items: FooItem[];
  isLoading: boolean;

  fetchItems: () => Promise<void>;
  reset: () => void;
}

export const useFooStore = create<FooState>((set) => ({
  items: [],
  isLoading: false,

  fetchItems: async () => {
    set({ isLoading: true });
    try {
      const response = await fooService.getAll();
      if (response.code === 1000) {
        set({ items: response.result });
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to fetch items";
      console.error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set({ items: [], isLoading: false }),
}));
```

### 12.5 Custom Hook Template

```tsx
import { useEffect, useCallback, useRef } from "react";

export function useFoo(id: string) {
  const { item, fetchItem } = useFooStore();
  const callbackRef = useRef<((data: FooItem) => void) | null>(null);

  useEffect(() => {
    fetchItem(id);
    return () => {
      callbackRef.current = null;
    };
  }, [id, fetchItem]);

  const handleAction = useCallback((data: FooItem) => {
    callbackRef.current?.(data);
  }, []);

  return { item, handleAction };
}
```

### 12.6 FlatList Pattern

```tsx
import { FlatList } from "react-native";

function FooList() {
  const { items, fetchItems, isLoading } = useFooStore();

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FooCard item={item} />}
      onRefresh={fetchItems}
      refreshing={isLoading}
      ListEmptyComponent={<EmptyState message="No items found" />}
    />
  );
}
```

### 12.7 Error Handling Pattern

```tsx
// In components — always use unknown
try {
  await fooService.create(data);
  // success feedback
} catch (error: unknown) {
  const msg =
    error instanceof AxiosError
      ? error.response?.data?.message ?? "Request failed"
      : "An unexpected error occurred";
  Alert.alert("Error", msg);
}
```

---

## 13. Do & Don't Guidelines

### DO

| # | Rule |
|---|---|
| 1 | Use NativeWind classes for all styling |
| 2 | Use `FlatList` / `FlashList` for lists (not `.map()`) |
| 3 | Use `expo-image` instead of RN `Image` |
| 4 | Use `catch (error: unknown)` and narrow the type |
| 5 | Use `useCallback` for handler props in lists |
| 6 | Use Expo Router's `router.push()` / `<Link>` for navigation |
| 7 | Use `useLocalSearchParams<T>()` with typed params |
| 8 | Clean up WebRTC / WebSocket connections in hook cleanup |
| 9 | Request permissions before accessing device features |
| 10 | Define constants in `constants/` — no magic values |

### DON'T

| # | Rule | Why |
|---|---|---|
| 1 | Don't use inline `style={{ }}` objects | Use NativeWind classes |
| 2 | Don't use `any` type anywhere | Use `unknown` and narrow |
| 3 | Don't use `catch (error: any)` | Use `catch (error: unknown)` |
| 4 | Don't use `.map()` for long lists in JSX | Use `FlatList` — performance |
| 5 | Don't use RN `Image` component | Use `expo-image` for caching |
| 6 | Don't leave `console.log` in committed code | Remove before committing |
| 7 | Don't exceed 300 lines per component file | Split into smaller pieces |
| 8 | Don't hardcode API URLs | Use environment variables via `process.env.EXPO_PUBLIC_*` |
| 9 | Don't use Vietnamese in code or comments | English only (i18n files excepted) |
| 10 | Don't initialize WebRTC eagerly | Wait for explicit call start |
| 11 | Don't re-request permissions on every mount | Store status in Zustand |
| 12 | Don't use `React.FC<Props>` | Use plain function with typed props |

---

## 14. Checklist before committing

- [ ] No component file exceeds 300 lines
- [ ] No `any` types introduced
- [ ] No `catch (error: any)` — only `catch (error: unknown)`
- [ ] No inline `style={{ }}` objects (use NativeWind classes)
- [ ] Tested on both Android and iOS simulators
- [ ] Permissions handled gracefully (denial case covered)
- [ ] All lists use `FlatList` / `FlashList` (not `.map()`)
- [ ] No `console.log` in committed code
- [ ] Constants defined — no magic strings or numbers
- [ ] English-only identifiers and comments
- [ ] `npm run lint` passes
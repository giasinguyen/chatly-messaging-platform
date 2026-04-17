# AGENTS.md — chatly-frontend

> **Scope:** React 19 + TypeScript 5 web client.
> Read this file before making any change to `chatly-frontend/`.

---

## 1. Tech Stack (do not upgrade without team discussion)

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 5 |
| Build | Vite 7.3 (SWC) |
| Routing | React Router v7 |
| State | Zustand |
| UI | shadcn/ui + Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| HTTP | Axios (with interceptors + auto-refresh) |
| WebSocket | STOMP.js + SockJS |
| Animation | Framer Motion |
| Notifications | Sonner |
| i18n | react-i18next |

---

## 2. Project Layout — where things live

```
src/
├── pages/
│   ├── public/         Landing, marketing
│   ├── auth/           Login, Register
│   ├── app/            Chat, Profile, Settings, Cloud
│   ├── admin/          Admin panel
│   └── fallback/       404, error boundaries
├── features/           Feature-scoped components and hooks
├── components/         Shared, reusable UI components (used by 2+ pages)
├── services/           Axios API calls — one file per domain
├── hooks/              Custom hooks (useChatSocket, usePresenceSocket, ...)
├── store/              Zustand stores — one file per domain
├── types/              TypeScript type definitions — no inline types for shared shapes
├── constants/          Shared constants — no magic strings/numbers
├── layouts/            App & Public layout wrappers
├── locales/            i18n translation files (vi, en)
├── validations/        Zod schemas for form validation
├── utils/              Pure utility functions
└── routes/             Route configuration
```

**Rules:**
- Page components live in `pages/` — they compose, they do not contain raw UI logic.
- Shared UI pieces go in `components/` only if used by 2+ pages.
- API calls live in `services/` — never call `axios` directly inside a component or hook.
- Zustand stores hold server state cache and UI state — never duplicate server state in local `useState`.

---

## 3. Component Rules

### Size limit — hard rule
**A component file must not exceed 300 lines.**
If it does:
1. Extract child components into separate files in the same folder.
2. Extract logic into a dedicated `use{Name}.ts` hook.
3. If the component manages multiple distinct concerns, split into sibling components.

There are no exceptions. A 2000-line component is a bug, not a style preference.

### Structure inside a component file
```tsx
// 1. Imports
// 2. Types / interfaces local to this file
// 3. Constants (if any)
// 4. Component function
//    a. hooks at the top
//    b. derived state / memos
//    c. handlers
//    d. early returns (loading, error)
//    e. JSX return
// 5. export default
```

### Props
- Always define props as a named interface: `interface MessageBubbleProps { ... }`.
- Do not use `React.FC<Props>` — use plain function with typed props: `function MessageBubble({ text }: MessageBubbleProps)`.
- Do not spread unknown props (`{...rest}`) unless building a primitive wrapper component.

---

## 4. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Components | PascalCase file + export | `MessageBubble.tsx` |
| Hooks | `use` prefix, camelCase | `useChatSocket.ts` |
| Stores | `use` prefix + `Store` suffix | `useConversationStore.ts` |
| Services | camelCase + `Service` suffix | `messageService.ts` |
| Types | PascalCase | `ConversationSummary`, `SendMessagePayload` |
| Constants | UPPER_SNAKE_CASE | `MAX_MESSAGE_LENGTH` |
| Event handlers | `handle` prefix | `handleSend`, `handleKeyDown` |
| Boolean variables | `is/has/can/should` prefix | `isLoading`, `hasUnread` |
| Util functions | camelCase | `formatDate`, `truncateText` |

**Language rule:** All code, comments, variable names, and component text **must be in English**.
Vietnamese is only acceptable in user-visible UI string literals inside the `vi` i18n locale file.

---

## 5. TypeScript Rules

- **No `any`.** Use `unknown` and narrow, or define a proper type.
- **No type assertions (`as X`)** unless you can add a comment explaining why it is safe.
- All API response shapes must be defined in `src/types/` — never inline `{ id: string; name: string }` ad-hoc.
- Enable strict mode — `tsconfig.json` must keep `"strict": true`.
- Prefer `interface` for object shapes, `type` for unions and aliases.
- Always use `catch (error: unknown)` — never `catch (error: any)`.

---

## 6. State Management

**Zustand store rules:**
- One store per domain: `useAuthStore`, `useConversationStore`, `usePresenceStore`.
- Stores export actions alongside state — do not mutate state outside the store.
- Do not put UI-only ephemeral state (modal open/close, hover) in Zustand — use local `useState`.

**Server state:**
- Use Axios service layer to fetch, then push results into the relevant Zustand store.
- When the same data is needed across pages, it lives in the store — not re-fetched per component.

---

## 7. API Service Layer

- One file per domain: `authService.ts`, `messageService.ts`, `conversationService.ts`.
- All functions are `async` and return typed promises.
- Error handling: let the Axios interceptor handle 401 refresh. Service functions throw on other errors — the calling component/hook decides how to display the error.
- Never construct `Authorization` headers manually — the Axios interceptor handles this.

---

## 8. WebSocket (STOMP)

- All WebSocket logic lives in `hooks/useChatSocket.ts` and `hooks/usePresenceSocket.ts`.
- Components subscribe to store state — they do not hold WebSocket references.
- On connection: subscribe to channels, update Zustand stores on incoming frames.
- On disconnection: clean up subscriptions in the hook's cleanup function.

---

## 9. Styling Rules

- Use **Tailwind utility classes** as the primary styling mechanism.
- Do not write custom CSS unless a Tailwind utility genuinely cannot achieve the effect.
- Use **shadcn/ui** components before building custom UI primitives.
- Dark/Light theme via CSS variables — do not hard-code color values outside of `tailwind.config`.
- Responsive design is required for all `pages/app/` views — mobile breakpoint `sm:` at minimum.

---

## 10. i18n

- All user-visible strings must be wrapped in the i18n translation function — no hardcoded English strings in JSX.
- Locale files: `vi` (primary), `en` (secondary).
- Keys use `snake_case` namespaced by domain: `chat.send_button`, `auth.login_title`.

---

## 11. Code Templates — Canonical Patterns

> AI agents and developers **must** follow these exact patterns when generating new code.

### 11.1 Page Component Template

```tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function FooPage() {
  const { t } = useTranslation();
  const { items, fetchItems, isLoading } = useFooStore();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">{t("foo.page_title")}</h1>
      {items.map((item) => (
        <FooCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### 11.2 Reusable Component Template

```tsx
interface FooCardProps {
  item: FooItem;
  onSelect?: (id: string) => void;
}

export default function FooCard({ item, onSelect }: FooCardProps) {
  const handleClick = () => {
    onSelect?.(item.id);
  };

  return (
    <div
      className="rounded-lg border p-4 hover:bg-accent cursor-pointer"
      onClick={handleClick}
    >
      <h3 className="font-medium">{item.name}</h3>
      <p className="text-sm text-muted-foreground">{item.description}</p>
    </div>
  );
}
```

### 11.3 API Service Template

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

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete(`/api/foos/${id}`);
    return response.data;
  },
};
```

### 11.4 Zustand Store Template

```tsx
import { create } from "zustand";
import { FooItem } from "@/types/foo";
import { fooService } from "@/services/fooService";

interface FooState {
  items: FooItem[];
  isLoading: boolean;
  selectedId: string | null;

  // Actions
  fetchItems: () => Promise<void>;
  selectItem: (id: string) => void;
  reset: () => void;
}

export const useFooStore = create<FooState>((set, get) => ({
  items: [],
  isLoading: false,
  selectedId: null,

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

  selectItem: (id: string) => set({ selectedId: id }),

  reset: () => set({ items: [], isLoading: false, selectedId: null }),
}));
```

### 11.5 Custom Hook Template

```tsx
import { useEffect, useCallback } from "react";

export function useFoo(conversationId: string) {
  const { items, fetchItems } = useFooStore();

  useEffect(() => {
    fetchItems();
    return () => {
      // cleanup if needed
    };
  }, [conversationId, fetchItems]);

  const handleAction = useCallback((id: string) => {
    // action logic
  }, []);

  return { items, handleAction };
}
```

### 11.6 Type Definition Template

```tsx
// src/types/foo.ts
export interface FooItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFooRequest {
  name: string;
  description?: string;
}

export interface UpdateFooRequest {
  name?: string;
  description?: string;
}
```

### 11.7 Zod Validation Schema Template

```tsx
// src/validations/fooSchema.ts
import { z } from "zod";

export const createFooSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
});

export type CreateFooFormData = z.infer<typeof createFooSchema>;
```

### 11.8 Error Handling Pattern

```tsx
// In components — always use unknown
try {
  await fooService.create(data);
  toast.success(t("foo.created_success"));
} catch (error: unknown) {
  const msg =
    error instanceof AxiosError
      ? error.response?.data?.message ?? "Request failed"
      : "An unexpected error occurred";
  toast.error(msg);
}
```

---

## 12. Do & Don't Guidelines

### DO

| # | Rule |
|---|---|
| 1 | Use `catch (error: unknown)` and narrow the type |
| 2 | Define all API response types in `src/types/` |
| 3 | Use the `fooService` object pattern for API calls |
| 4 | Use `create<State>((set, get) => ({...}))` for stores |
| 5 | Use `interface` for component props with descriptive names |
| 6 | Use `export default function ComponentName()` for components |
| 7 | Use Tailwind classes for all styling |
| 8 | Use shadcn/ui components before building custom ones |
| 9 | Wrap user-visible strings in `t()` for i18n |
| 10 | Define constants in `src/constants/` — no magic values |

### DON'T

| # | Rule | Why |
|---|---|---|
| 1 | Don't use `any` type anywhere | Use `unknown` and narrow |
| 2 | Don't use `catch (error: any)` | Use `catch (error: unknown)` |
| 3 | Don't call `axios` directly in components | Use service layer |
| 4 | Don't use `React.FC<Props>` | Use plain function with typed props |
| 5 | Don't use `dangerouslySetInnerHTML` without sanitization | XSS risk |
| 6 | Don't leave `console.log` in committed code | Remove or use proper logging |
| 7 | Don't exceed 300 lines per component file | Split into smaller pieces |
| 8 | Don't write custom CSS when Tailwind works | Consistency |
| 9 | Don't duplicate server state in local `useState` | Use Zustand store |
| 10 | Don't hardcode API URLs | Use environment variables via `import.meta.env` |
| 11 | Don't use Vietnamese in code or comments | English only (i18n files excepted) |
| 12 | Don't use inline `style={{ }}` for layout | Use Tailwind classes |

---

## 13. Checklist before committing

- [ ] No component file exceeds 300 lines
- [ ] No `any` types introduced
- [ ] No `catch (error: any)` — only `catch (error: unknown)`
- [ ] All new API shapes defined in `src/types/`
- [ ] All user-visible strings go through i18n `t()`
- [ ] English-only identifiers, comments, and variable names
- [ ] New Axios calls go through `services/` — not inline in components
- [ ] No `console.log` in committed code
- [ ] Constants defined — no magic strings or numbers
- [ ] ESLint passes: `npm run lint`
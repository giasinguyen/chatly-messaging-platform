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
├── components/         Shared, reusable UI components
├── services/           Axios API calls — one file per domain
├── hooks/              Custom hooks (useChatSocket, usePresenceSocket, ...)
├── store/              Zustand stores — one file per domain
├── types/              TypeScript type definitions — no inline types for shared shapes
├── layouts/            App & Public layout wrappers
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
| Event handlers | `handle` prefix | `handleSend`, `handleKeyDown` |
| Boolean variables | `is/has/can/should` prefix | `isLoading`, `hasUnread` |

**Language rule:** All code, comments, variable names, and component text **must be in English**.
Vietnamese is only acceptable in user-visible UI string literals that are part of the `vi` i18n locale file.

---

## 5. TypeScript Rules

- **No `any`.** Use `unknown` and narrow, or define a proper type.
- **No type assertions (`as X`)** unless you can add a comment explaining why it is safe.
- All API response shapes must be defined in `src/types/` — never inline `{ id: string; name: string }` ad-hoc.
- Enable strict mode — `tsconfig.json` must keep `"strict": true`.
- Prefer `interface` for object shapes, `type` for unions and aliases.

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

## 11. Checklist before committing

- [ ] No component file exceeds 300 lines
- [ ] No `any` types introduced
- [ ] All new API shapes defined in `src/types/`
- [ ] All user-visible strings go through i18n
- [ ] English-only identifiers, comments, and variable names
- [ ] New Axios calls go through `services/` — not inline in components
- [ ] ESLint passes: `npm run lint`
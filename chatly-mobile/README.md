# Expo + NativeWind + Gluestack + Zustand

```
src/
│
├── app/                 # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── (tabs)/
│   │   ├── home.tsx
│   │   ├── chat.tsx
│   │   └── profile.tsx
│   │
│   └── _layout.tsx
│
├── components/          # Reusable components
│   ├── ui/              # Gluestack components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── card.tsx
│   │
│   ├── chat/
│   │   ├── message-bubble.tsx
│   │   └── message-list.tsx
│   │
│   └── common/
│       ├── avatar.tsx
│       └── loading.tsx
│
├── features/            # Business logic modules
│   ├── auth/
│   │   ├── auth.store.ts
│   │   ├── auth.service.ts
│   │   └── auth.types.ts
│   │
│   ├── chat/
│   │   ├── chat.store.ts
│   │   ├── chat.service.ts
│   │   └── chat.types.ts
│
├── store/               # Zustand global store
│   ├── auth.store.ts
│   └── app.store.ts
│
├── services/            # API / websocket
│   ├── api.ts
│   ├── axios.ts
│   └── socket.ts
│
├── hooks/               # custom hooks
│   ├── useAuth.ts
│   ├── useSocket.ts
│   └── useTheme.ts
│
├── lib/                 # config libraries
│   ├── gluestack.ts
│   ├── query-client.ts
│   └── storage.ts
│
├── theme/               # design tokens
│   ├── colors.ts
│   ├── spacing.ts
│   └── typography.ts
│
├── utils/
│   ├── format.ts
│   └── helpers.ts
│
├── types/
│   ├── user.ts
│   └── message.ts
│
assets/
│
app.json
tailwind.config.js
package.json
```


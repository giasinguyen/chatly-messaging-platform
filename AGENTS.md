# AGENTS.md — Chatly Messaging Platform

> **This is the root-level guide for the entire monorepo.**
> Every contributor and every coding agent must read this file first.
> Then read the `AGENTS.md` inside the specific module you are working on.

---

## Repository Structure

```
chatly-messaging-platform/
├── chatly-agent/       Python 3.12 / FastAPI / LangGraph AI chatbot service
├── chatly-backend/     Spring Boot 4 / Java 21 API server
├── chatly-frontend/    React 19 / TypeScript 5 / Vite web client
└── chatly-mobile/      Expo 54 / React Native mobile client
```

Each module has its own `AGENTS.md` with language- and framework-specific rules.
**The rules in a module's `AGENTS.md` take precedence over this file for module-specific decisions.**

---

## 1. The One Rule That Applies Everywhere

> **All code, comments, identifiers, commit messages, PR descriptions, and AGENTS.md files must be written in English.**

Vietnamese is allowed **only** in:
- User-visible UI strings inside the `vi` i18n locale files.
- Internal team discussion channels (Slack, Discord, etc.).

Rationale: the codebase is read by coding agents and future contributors who may not read Vietnamese. Mixed-language code is the single fastest way to make AI tooling produce inconsistent output.

---

## 2. Module Responsibilities & Boundaries

| Module | Owns | Does NOT own |
|---|---|---|
| `chatly-backend` | Auth, users, contacts, groups, conversations, presence, WebSocket broker | Message AI processing, mobile push delivery |
| `chatly-agent` | LLM pipeline, prompt management, AI response generation, agent sessions | User auth, main message storage, WebSocket connections |
| `chatly-frontend` | Web UI, web WebSocket client | Any server-side logic |
| `chatly-mobile` | Mobile UI, mobile push, WebRTC calls | Any server-side logic |

**Cross-module calls:**
- Frontend and Mobile → Backend via REST + WebSocket (STOMP). Never direct DB access.
- Backend → Agent via internal REST API. Agent is never called by frontend/mobile directly.
- Agent → Backend via internal REST API to deliver AI responses back into the message flow.

If you are adding a feature that requires changes in more than one module, coordinate with the owner of each module and update their respective `AGENTS.md` if contracts change.

---

## 3. Git Workflow

### Branches

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Direct commits are blocked. |
| `develop` | Integration branch. All features merge here first. |

**Never commit directly to `main` or `develop`.**

### Commit Messages — Conventional Commits

Format: `type(scope): short description`

```
feat(chat): add typing indicator to group conversations
fix(auth): refresh token not rotated on reuse
chore(mobile): upgrade expo to 54.0.1
docs(backend): update API reference for /api/messages
```

| Type | When to use |
|---|---|
| `feat` | New feature visible to the user |
| `fix` | Bug fix |
| `chore` | Non-functional change (deps, config, tooling) |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behavior change |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |

- Subject line: imperative mood, lowercase, no period, max 72 characters.
- If the commit needs more explanation, add a body after a blank line.

### Pull Requests

- PR title follows the same Conventional Commits format.
- PR description must include: **what changed**, **why**, and **how to test**.
- Link to the relevant issue/ticket if one exists.
- A PR must pass all CI checks before merge.
- Minimum 1 reviewer approval required before merging to `develop`.

---

## 4. Universal Code Quality Rules

These apply to every module regardless of language or framework.

### 4.1 Component / Class Size
- **Frontend & Mobile:** No component file exceeds **300 lines**. Split before committing.
- **Backend:** No service method exceeds **~50 lines**. Extract helpers or sub-services.
- **Agent:** No service function or agent method exceeds **~50 lines**. No router handler exceeds **~30 lines**.

There are no exceptions. Large files are a signal that responsibilities are not separated.

### 4.2 No Magic Numbers or Strings
Define constants with descriptive names. Do not scatter literal values (`7`, `86400000`, `"OWNER"`) across the codebase.

| Module | Where to define constants |
|---|---|
| Backend | `static final` fields in the service/class or a shared `Constants.java` |
| Frontend | `src/constants/` directory |
| Mobile | `constants/` directory |
| Agent | Module-level `UPPER_SNAKE_CASE` variables at the top of the file |

### 4.3 No Dead Code
Do not comment out code and commit it. If something is temporarily disabled, add a `// TODO(your-name): reason` comment with a ticket reference.

### 4.4 DRY Within a Module
Do not copy logic between files in the same module. Extract to a shared utility or service. However, **do not share code between modules** (frontend and mobile are separate apps with separate dependency trees).

### 4.5 Comments Policy
- **No trivial comments.** Do not comment what the code already says (`// increment counter`).
- **Do comment WHY**, not WHAT, when the reason is non-obvious.
- **No commented-out code blocks.** Use version control instead.
- **Docstrings/Javadoc** only on public APIs, service methods, and complex algorithms.

---

## 5. Global Naming Conventions

> These naming rules apply uniformly across all modules. Module-specific extensions are in each module's `AGENTS.md`.

### 5.1 Universal Rules

| Artifact | Convention | All Modules |
|---|---|---|
| Boolean variables | `is/has/can/should` prefix | `isLoading`, `hasUnread`, `is_authenticated` |
| Event handlers (TS) | `handle` prefix | `handleSend`, `handleKeyDown` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_PAGE_SIZE` |
| Enum values | UPPER_SNAKE_CASE | `SENT`, `DELIVERED`, `READ` |

### 5.2 Per-Module Naming

| Artifact | Backend (Java) | Frontend/Mobile (TS) | Agent (Python) |
|---|---|---|---|
| Classes / Components | `PascalCase` | `PascalCase` | `PascalCase` |
| Methods / Functions | `camelCase` | `camelCase` | `snake_case` |
| Variables / Fields | `camelCase` | `camelCase` | `snake_case` |
| Files — code | `PascalCase.java` | `PascalCase.tsx` (components), `camelCase.ts` (utils) | `snake_case.py` |
| Files — tests | `PascalCaseTest.java` | `PascalCase.test.tsx` | `test_snake_case.py` |
| REST endpoints | kebab-case nouns | — | kebab-case nouns |
| DTOs / Models | `{Domain}Request` / `{Domain}Response` | `{Domain}Request` / `{Domain}Response` | `{Domain}Create` / `{Domain}Response` |
| Stores | — | `use{Domain}Store` | — |
| Hooks | — | `use{Name}` | — |
| Services | `{Domain}Service` | `{domain}Service` (object) | `{Domain}Service` (class) |
| Repositories | `{Domain}Repository` | — | `{Domain}Repository` |

---

## 6. Unified API Response Format

> All modules must produce and consume the same response envelope.

### 6.1 Backend Response Envelope (`ApiResponse<T>`)

```json
{
  "code": 1000,
  "message": "Success",
  "result": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `code` | `int` | `1000` = success. Error codes are defined in `ErrorCode.java`. |
| `message` | `string?` | Human-readable message. `null` on success unless explicit. |
| `result` | `T?` | Response payload. `null` on errors. |

**Rules:**
- Every backend controller must return `ApiResponse<T>` — no raw `ResponseEntity<Map>` or plain objects.
- Error responses use the same envelope with `code != 1000` and `result = null`.
- The `HealthController` must also use `ApiResponse` (this is a known inconsistency to fix).

### 6.2 Agent Response Format

The agent uses plain Pydantic models (not `ApiResponse`) because it is an internal service.
The backend wraps agent responses into `ApiResponse` before sending to clients.

### 6.3 Frontend / Mobile — Consuming Responses

```typescript
interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}
```

- All service functions return `Promise<ApiResponse<T>>`.
- Check `response.code === 1000` for success.
- Error handling: interceptor handles 401, components handle business errors via `toast.error(response.message)`.

---

## 7. Unified Error Handling Strategy

### 7.1 Backend

| Layer | Throws | Catches |
|---|---|---|
| Controller | Nothing | Nothing (delegates to `@ControllerAdvice`) |
| Service | `AppException(ErrorCode.*)` | Domain-specific exceptions from repositories |
| Repository | JPA/Mongo native exceptions | Nothing |
| `GlobalExceptionHandler` | Nothing | Everything → `ApiResponse<Void>` |

### 7.2 Agent

| Layer | Throws | Catches |
|---|---|---|
| Router | `HTTPException` (mapped from service errors) | `ValueError` → 400, `SessionNotFoundError` → 404 |
| Service | `SessionNotFoundError`, `ValueError` | Nothing (let routers catch) |
| Repository | Native DB exceptions | Nothing |

### 7.3 Frontend / Mobile

| Layer | Throws | Catches |
|---|---|---|
| Service | Re-throws axios errors | Nothing (interceptor handles 401) |
| Hook / Component | Nothing | `catch (error: unknown)` → `toast.error(msg)` |

**Critical rule:** Never use `catch (error: any)`. Always use `catch (error: unknown)` and narrow the type:

```typescript
// CORRECT
catch (error: unknown) {
  const msg = error instanceof AxiosError
    ? error.response?.data?.message ?? "Request failed"
    : "An unexpected error occurred";
  toast.error(msg);
}

// WRONG — do not use
catch (error: any) {
  toast.error(error.response?.data?.message);
}
```

---

## 8. Logging Standards

### 8.1 Format

| Module | Library | Format |
|---|---|---|
| Backend | SLF4J + Logback | `timestamp [thread] level logger - message` |
| Agent | Python `logging` | JSON structured (via `logging_config.py`) |
| Frontend | `console.*` (dev only) | No production logging |
| Mobile | `console.*` (dev only) | No production logging |

### 8.2 Log Levels

| Level | When to use |
|---|---|
| `ERROR` | Unrecoverable failures, unhandled exceptions |
| `WARN` | Recoverable anomalies, degraded service |
| `INFO` | Significant business events (user login, message sent, session created) |
| `DEBUG` | Development diagnostics (SQL queries, HTTP payloads in dev) |

### 8.3 What NEVER to Log

- JWT tokens (any level, any module)
- Passwords or password hashes
- Email addresses, phone numbers, message content
- Full request/response bodies containing PII
- API keys or secrets

User IDs and session IDs are acceptable for tracing.

---

## 9. Environment & Configuration Management

### 9.1 Rules

- Secrets **must** come from environment variables — never hardcoded in `.yml`, `.env.example`, or source code.
- `.env.example` files contain **placeholder values only** (e.g., `JWT_SECRET=change-me-in-production`).
- Each module has its own `.env.example` documenting all required variables.
- Use profile/environment separation: `dev`, `prod` (backend: `application-dev.yml` / `application-prod.yml`; agent: `APP_ENV` variable).

### 9.2 Per-Module Config Pattern

| Module | Mechanism | File |
|---|---|---|
| Backend | Spring `@Value` / `application.yml` | `src/main/resources/application.yml` |
| Agent | Pydantic `BaseSettings` | `app/config.py` |
| Frontend | Vite `import.meta.env.VITE_*` | `.env`, `.env.example` |
| Mobile | Expo `process.env.EXPO_PUBLIC_*` | `.env`, `.env.example` |

---

## 10. Authentication & Authorization Consistency

### 10.1 Flow

```
Client (Frontend/Mobile)
  → POST /api/auth/login { identifier, password }
  ← { code: 1000, result: { token, refreshToken, user } }

Client stores token in localStorage (web) / AsyncStorage (mobile).
All subsequent requests include Authorization: Bearer <token>.

Backend validates JWT via JwtAuthenticationFilter.
Backend extracts userId from JWT subject claim.
```

### 10.2 Backend Auth Helper — Canonical Form

All controllers must use the same helper pattern. The return type is **`String`** (not `UUID`):

```java
// CORRECT — String return, consistent across all controllers
private String getAuthenticatedUserId() {
    return SecurityContextHolder.getContext()
        .getAuthentication().getPrincipal().toString();
}
```

If a service method requires `UUID`, the **service** converts — not the controller.

### 10.3 Agent Auth

The agent is an internal service. Authentication is via `X-Internal-API-Key` header, validated in `utils/security.py`. User identity is passed via `X-User-Id` header from the backend.

---

## 11. Security — Non-Negotiables

- **No secrets in source code.** No API keys, DB passwords, JWT secrets, or service tokens committed to the repository, ever — not even in `.env.example` with real values.
- **No PII in logs.** User IDs in logs are acceptable. Email addresses, message content, and phone numbers are not.
- **Input validation at every boundary.** Backend validates all incoming HTTP requests. Agent sanitizes all user-provided content before LLM calls.
- **JWT never logged.** At any log level, in any module.
- **SQL/NoSQL injection prevention.** Use parameterized queries (JPA/Spring Data), never string concatenation.
- **XSS prevention.** React auto-escapes by default. Never use `dangerouslySetInnerHTML` without sanitization.

---

## 12. AI Agent Coding Rules

> These rules apply to all AI coding assistants (Copilot, Cursor, Windsurf, Claude, etc.) working in this codebase.

### 12.1 Before Writing Any Code

1. **Read the module `AGENTS.md` first** before writing any code in a module.
2. **Read the existing code around the change area** — match the existing patterns exactly.
3. **Check if similar code already exists** — do not duplicate. Call existing services, hooks, utilities.

### 12.2 Absolute Prohibitions

| Rule | Applies To |
|---|---|
| No `any` type | TypeScript (frontend, mobile) |
| No Vietnamese | All code, comments, identifiers, docstrings |
| No `console.log` in committed code | Frontend, mobile (use proper logging or remove) |
| No `print()` in committed code | Agent (use `logging.getLogger(__name__)`) |
| No inline styles `style={{ }}` | Mobile (use NativeWind classes) |
| No `@Autowired` on fields | Backend (use `@RequiredArgsConstructor`) |
| No entity exposure in API responses | Backend (always use DTOs via MapStruct) |
| No business logic in controllers/routers | Backend, agent |
| No database calls in services | Agent (services call repositories) |
| No secrets in any file | All modules |

### 12.3 Code Generation Rules

1. **Follow existing architecture** — do not introduce new patterns, libraries, or structural changes without explicit approval.
2. **Respect size limits** — 300 lines for components, ~50 lines for service methods. If the task requires more, split proactively.
3. **No unnecessary comments** — only comment WHY, not WHAT. No `// constructor`, `// getter`, `// import X`.
4. **Define constants** — do not hardcode business values. Ask the developer where to define them if unclear.
5. **Type everything** — full type annotations in Python, strict TypeScript types, no raw generics in Java.
6. **Match the existing service object pattern** in frontend/mobile:
   ```typescript
   export const fooService = {
     getAll: async (): Promise<ApiResponse<Foo[]>> => { ... },
   };
   ```
7. **Match the existing store pattern** in frontend/mobile:
   ```typescript
   export const useFooStore = create<FooState>((set, get) => ({ ... }));
   ```
8. **When adding a new API endpoint or WebSocket channel**, update the registry tables in this file and the relevant module `AGENTS.md`.
9. **When in doubt about where a file belongs**, refer to the Project Layout section of the relevant module's `AGENTS.md`.

### 12.4 Testing Requirements

| Module | Requirement |
|---|---|
| Backend | Unit test for every `Service` class. Integration tests for WebSocket handlers. |
| Agent | Unit test for every service and agent. Integration tests for every router endpoint. |
| Frontend | No mandatory tests (follow team decision). |
| Mobile | No mandatory tests (follow team decision). |

---

## 13. WebSocket Channel Registry

> Single source of truth. Update this when any module adds or changes a channel.

| Destination / Topic | Direction | Module | Description |
|---|---|---|---|
| `/app/chat.send` | client → server | backend | Send a new message |
| `/app/chat.typing` | client → server | backend | Broadcast typing status |
| `/app/chat.seen` | client → server | backend | Mark message as seen |
| `/topic/conversation/{id}` | server → client | backend | Incoming messages for a conversation |
| `/topic/presence` | server → client | backend | Online/offline broadcast |
| `/topic/feed/{userId}` | server → client | backend | New posts for the user's home feed |
| `/queue/errors` | server → client | backend | Private error delivery |

---

## 14. REST API Module Map

> High-level. Full reference in `chatly-backend/docs/`.

| Prefix | Module | Description |
|---|---|---|
| `/api/auth/**` | backend | Authentication — register, login, logout, refresh |
| `/api/users/**` | backend | User profiles |
| `/api/contacts/**` | backend | Friend requests, blocking |
| `/api/conversations/**` | backend | Conversation management |
| `/api/messages/**` | backend | Message CRUD |
| `/api/groups/**` | backend | Group management |
| `/api/calls/**` | backend | Call history and RTC token issuance |
| `/api/health` | backend | Health check |
| `/api/posts/saved` | backend | List posts saved by the authenticated user |
| `/api/posts/{postId}/share` | backend | Increment post share count after sharing into chat |
| `/api/reels/**` | backend | Upload and browse short video Reels with privacy filtering |
| `/api/reports/**` | backend | Post and user reporting for moderation queue |
| `/internal/agent/**` | agent | Backend↔Agent internal API (not public) |

---

## 15. Known Inconsistencies to Fix

> Track these so AI agents and developers actively resolve them when touching related code.

| # | Module | Issue | Required Fix |
|---|---|---|---|
| 1 | backend | `HealthController` returns raw `ResponseEntity<Map>` | Wrap in `ApiResponse<T>` |
| 2 | backend | `ContactController.getAuthenticatedUserId()` returns `UUID` | Change to return `String`, convert in service |
| 3 | frontend | `ChatWindow.tsx` ~700 lines, `MessageList.tsx` ~800 lines | Split into sub-components |
| 4 | frontend | `authService.register` uses `any` payload type | Define `RegisterRequest` type |
| 5 | frontend | i18n not implemented — all strings hardcoded | Implement with `react-i18next` |
| 6 | frontend | `catch (error: any)` in multiple components | Change to `catch (error: unknown)` |
| 7 | mobile | Inline `style={{ }}` used alongside NativeWind | Migrate to NativeWind classes |

---

## 16. Feature Development Checklist

Before opening a PR for any feature that touches multiple modules:

- [ ] Backend contract (endpoint or WebSocket channel) documented and agreed upon before implementation starts
- [ ] If a new WebSocket channel is added, the table in `chatly-backend/AGENTS.md` and this file are updated
- [ ] If the agent API contract changes, both `chatly-agent/AGENTS.md` and `chatly-backend/AGENTS.md` are updated
- [ ] No secrets added to any config file
- [ ] All new code is in English
- [ ] Lint passes in every modified module
- [ ] Tests added or updated where required by the module's `AGENTS.md`
- [ ] No `any` types introduced (TypeScript)
- [ ] No file exceeds 300 lines (frontend/mobile components)
- [ ] Error responses use `ApiResponse` wrapper (backend)
- [ ] Constants defined — no magic numbers or strings

---

## 17. Onboarding — New Developer

1. Clone the repo and read this file.
2. Read `chatly-backend/AGENTS.md` if you are on backend.
3. Read `chatly-frontend/AGENTS.md` if you are on web frontend.
4. Read `chatly-mobile/AGENTS.md` if you are on mobile.
5. Read `chatly-agent/AGENTS.md` if you are on the AI agent.
6. Set up local infrastructure: `docker-compose -f chatly-backend/docker-compose.yml up -d`
7. Follow the Getting Started steps in `README.md`.
8. Your first PR should be a small, clearly scoped change — use it to get familiar with the review process.

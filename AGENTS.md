# AGENTS.md — Chatly Messaging Platform

> **This is the root-level guide for the entire monorepo.**
> Every contributor and every coding agent must read this file first.
> Then read the `AGENTS.md` inside the specific module you are working on.

---

## Repository Structure

```
chat-messaging-platform/
├── chatly-agent/       LLM-based AI chatbot service
├── chatly-backend/     Spring Boot 4 / Java 21 API server
├── chatly-frontend/    React 19 / TypeScript web client
└── chatly-mobile/      Expo 54 / React Native mobile client
```

Each module has its own `AGENTS.md` with language- and framework-specific rules.
**The rules in a module's `AGENTS.md` take precedence over this file for module-specific decisions.**

---

## 1. The One Rule That Applies Everywhere

> **All code, comments, identifiers, commit messages, and PR descriptions must be written in English.**

Vietnamese is allowed only in:
- User-visible UI strings inside the `vi` i18n locale files.
- Internal team discussion channels (Slack, Discord, etc.).

Rationale: the codebase is read by coding agents and future contributors who may not read Vietnamese. Mixed-language code is the single fastest way to make AI tooling produce inconsistent output.

---

## 2. Module Responsibilities & Boundaries

| Module | Owns | Does NOT own |
|---|---|---|
| `chatly-backend` | Auth, users, contacts, groups, conversations, presence, WebSocket broker | Message AI processing, mobile push delivery |
| `chatly-agent` | LLM pipeline, prompt management, AI response generation | User auth, message storage, WebSocket connections |
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

### Component / Class Size
- **Frontend & Mobile:** No component file exceeds **300 lines**. Split before committing.
- **Backend:** No service method exceeds **~50 lines**. Extract helpers or sub-services.
- **Agent:** No pipeline step function exceeds **~50 lines**.

There are no exceptions. Large files are a signal that responsibilities are not separated.

### No Magic Numbers or Strings
Define constants with descriptive names. Do not scatter literal values (`7`, `86400000`, `"OWNER"`) across the codebase.

### No Dead Code
Do not comment out code and commit it. If something is temporarily disabled, add a `// TODO(your-name): reason` comment with a ticket reference.

### DRY Within a Module
Do not copy logic between files in the same module. Extract to a shared utility or service. However, **do not share code between modules** (frontend and mobile are separate apps with separate dependency trees).

---

## 5. Security — Non-Negotiables

- **No secrets in source code.** No API keys, DB passwords, JWT secrets, or service tokens committed to the repository, ever — not even in `.env.example` with real values.
- **No PII in logs.** User IDs in logs are acceptable. Email addresses, message content, and phone numbers are not.
- **Input validation at every boundary.** Backend validates all incoming HTTP requests. Agent sanitizes all user-provided content before LLM calls.
- **JWT never logged.** At any log level, in any module.

---

## 6. Feature Development Checklist

Before opening a PR for any feature that touches multiple modules:

- [ ] Backend contract (endpoint or WebSocket channel) documented and agreed upon before implementation starts
- [ ] If a new WebSocket channel is added, the table in `chatly-backend/AGENTS.md` and this file are updated
- [ ] If the agent API contract changes, both `chatly-agent/AGENTS.md` and `chatly-backend/AGENTS.md` are updated
- [ ] No secrets added to any config file
- [ ] All new code is in English
- [ ] Lint passes in every modified module
- [ ] Tests added or updated where required by the module's `AGENTS.md`

---

## 7. WebSocket Channel Registry

> Single source of truth. Update this when any module adds or changes a channel.

| Destination / Topic | Direction | Module | Description |
|---|---|---|---|
| `/app/chat.send` | client → server | backend | Send a new message |
| `/app/chat.typing` | client → server | backend | Broadcast typing status |
| `/app/chat.seen` | client → server | backend | Mark message as seen |
| `/topic/conversation/{id}` | server → client | backend | Incoming messages for a conversation |
| `/topic/presence` | server → client | backend | Online/offline broadcast |
| `/queue/errors` | server → client | backend | Private error delivery |

---

## 8. REST API Module Map

> High-level. Full reference in `chatly-backend/docs/`.

| Prefix | Module | Description |
|---|---|---|
| `/api/auth/**` | backend | Authentication — register, login, logout, refresh |
| `/api/users/**` | backend | User profiles |
| `/api/contacts/**` | backend | Friend requests, blocking |
| `/api/conversations/**` | backend | Conversation management |
| `/api/messages/**` | backend | Message CRUD |
| `/api/groups/**` | backend | Group management |
| `/api/health` | backend | Health check |
| `/internal/agent/**` | agent | Backend↔Agent internal API (not public) |

---

## 9. Coding Agent Instructions

If you are an AI coding assistant (Cursor, Copilot, Windsurf, Claude, etc.) working in this codebase:

1. **Read the module `AGENTS.md` first** before writing any code in a module.
2. **Do not generate code that violates the size limits** (300 lines for components, ~50 lines for service methods). If the task requires more, split into multiple files proactively.
3. **Do not hardcode any string or number that represents a business constant** — ask the developer where to define it.
4. **Do not introduce `any` types** in TypeScript files.
5. **Do not add Vietnamese** to code, comments, or identifiers.
6. **When adding a new API endpoint or WebSocket channel**, always ask if the registry tables in this file and the relevant module `AGENTS.md` need updating.
7. **When in doubt about where a file belongs**, refer to the Project Layout section of the relevant module's `AGENTS.md` before creating it.

---

## 10. Onboarding — New Developer

1. Clone the repo and read this file.
2. Read `chatly-backend/AGENTS.md` if you are on backend.
3. Read `chatly-frontend/AGENTS.md` if you are on web frontend.
4. Read `chatly-mobile/AGENTS.md` if you are on mobile.
5. Read `chatly-agent/AGENTS.md` if you are on the AI agent.
6. Set up local infrastructure: `docker-compose -f chatly-backend/docker-compose.yml up -d`
7. Follow the Getting Started steps in `README.md`.
8. Your first PR should be a small, clearly scoped change — use it to get familiar with the review process.
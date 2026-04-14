# AGENTS.md — chatly-backend

> **Scope:** Spring Boot 4.0.3 / Java 21 backend service.
> Read this file before making any change to `chatly-backend/`.

---

## 1. Tech Stack (do not upgrade without team discussion)

| Layer | Technology |
|---|---|
| Runtime | Java 21 (use records, sealed classes, pattern matching freely) |
| Framework | Spring Boot 4.0.3 |
| REST | Spring Web MVC |
| WebSocket | Spring WebSocket + STOMP + SockJS |
| Security | Spring Security + JJWT 0.12.6 |
| SQL ORM | Spring Data JPA + Hibernate |
| NoSQL ODM | Spring Data MongoDB |
| Cache | Spring Data Redis |
| Mapping | MapStruct 1.6.3 + Lombok |
| Databases | PostgreSQL 15, MongoDB 6, Redis 7 |

---

## 2. Project Layout — where things live

```
src/main/java/com/chatly/
├── controller/     REST controllers — HTTP boundary only, no business logic
├── service/        Business logic — one service per domain
├── model/
│   ├── postgres/   JPA @Entity classes (User, Contact, GroupMember)
│   └── mongo/      MongoDB @Document classes (Conversation, Message, ...)
├── websocket/      STOMP controllers + interceptors
├── security/       JWT provider, filter, security config
├── dto/            Request / Response DTOs (never expose entities directly)
├── repository/     JPA + Mongo repository interfaces
├── mapper/         MapStruct interfaces only — no manual mapping elsewhere
└── exception/      @ControllerAdvice + custom exception hierarchy
```

**Rules:**
- Controllers call services. Services call repositories. Never skip a layer.
- Controllers must not contain `if/else` business logic — delegate everything.
- Never inject a `Repository` directly into a `Controller`.

---

## 3. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Classes | PascalCase | `MessageService`, `ConversationController` |
| Methods / fields | camelCase | `findByConversationId`, `lastSeenAt` |
| Constants | UPPER_SNAKE | `MAX_GROUP_MEMBERS` |
| REST endpoints | kebab-case nouns | `/api/group-members`, `/api/auth/refresh` |
| JPA entities | Singular noun | `User`, `Contact` |
| MongoDB docs | Singular noun | `Message`, `Conversation` |
| DTOs | `{Domain}Request` / `{Domain}Response` | `SendMessageRequest`, `UserResponse` |
| Mappers | `{Domain}Mapper` | `MessageMapper` |

All identifiers, comments, and Javadoc **must be in English**.

---

## 4. REST API Design

- All routes are prefixed `/api/`.
- Use standard HTTP verbs: `GET` read, `POST` create, `PUT` full update, `PATCH` partial update, `DELETE` remove.
- Return `ResponseEntity<T>` from controllers — never return raw objects.
- Validation via `@Valid` on request bodies + Bean Validation annotations on DTOs.
- Error responses use the global `@ControllerAdvice` in `exception/` — never construct error responses inline.
- Pagination: use Spring's `Pageable` for any list endpoint that may grow unbounded.

---

## 5. WebSocket Channels

Do not add new channels without updating `AGENTS.md` in root.

| Destination | Direction | Description |
|---|---|---|
| `/app/chat.send` | client → server | Send a new message |
| `/app/chat.typing` | client → server | Broadcast typing status |
| `/app/chat.seen` | client → server | Mark message as seen |
| `/topic/conversation/{id}` | server → client | Incoming messages |
| `/topic/presence` | server → client | Online/offline broadcast |
| `/queue/errors` | server → client | Private error delivery |

---

## 6. Security Rules

- **Never** log JWT tokens, passwords, or PII at any log level.
- All endpoints require authentication unless explicitly annotated `@PermitAll` or listed in `WebSecurityConfig`.
- JWT validated at WebSocket handshake via `WebSocketAuthInterceptor` — do not duplicate validation inside message handlers.
- New endpoints must be explicitly added to `WebSecurityConfig` — do not use wildcard permits.

---

## 7. Database Guidelines

**PostgreSQL (JPA)**
- All entities must have `@CreatedDate` and `@LastModifiedDate` via `@EntityListeners(AuditingEntityListener.class)`.
- Use `UUID` as primary key type, generated with `@UuidGenerator`.
- Never use `FetchType.EAGER` — default to `LAZY`, fetch explicitly when needed.
- Write schema migrations as Flyway scripts in `resources/db/migration/` — never use `spring.jpa.hibernate.ddl-auto=update` in prod.

**MongoDB**
- All `@Document` classes must declare `@CompoundIndex` for any field pair queried together.
- Use `ObjectId` as `_id`, exposed as `String` in DTOs.

**Redis**
- Key format: `{domain}:{id}:{qualifier}` — e.g. `presence:user:abc123`, `blacklist:token:xyz`.
- Always set a TTL. Never store open-ended keys.

---

## 8. Code Style & Quality

- **Lombok:** use `@RequiredArgsConstructor` for constructor injection — never `@Autowired` on fields.
- **MapStruct:** all entity↔DTO conversions go through a `Mapper` interface — no manual `new SomeDto(entity.getX(), ...)` calls.
- **Exception handling:** throw domain exceptions (`ContactNotFoundException`, etc.) from services; let `@ControllerAdvice` translate to HTTP status.
- **Service method size:** if a method exceeds ~50 lines, extract private helper methods or split into sub-services.
- **Test coverage:** every `Service` class must have a corresponding unit test in `src/test/`. WebSocket handlers must have integration tests.

---

## 9. Configuration

- Secrets (`jwt.secret`, DB passwords) **must** come from environment variables — never hardcode in any `.yml`.
- Use `application-dev.yml` for local defaults, `application-prod.yml` for production overrides.
- Add new config keys to both profiles and document them in the root `README.md` environment table.

---

## 10. Checklist before committing

- [ ] No business logic in controllers
- [ ] New endpoint added to `WebSecurityConfig`
- [ ] DTO used (entity not exposed in response)
- [ ] MapStruct mapper updated if model changed
- [ ] No secrets in `.yml` files
- [ ] Unit test added or updated for changed service
- [ ] English-only identifiers and comments
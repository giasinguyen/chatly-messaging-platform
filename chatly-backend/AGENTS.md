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
├── dto/
│   ├── request/    Incoming DTOs with validation annotations
│   └── response/   Outgoing DTOs (never expose entities directly)
├── repository/
│   ├── postgres/   JPA repository interfaces
│   └── mongo/      MongoDB repository interfaces
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
| Constants | UPPER_SNAKE_CASE | `MAX_GROUP_MEMBERS` |
| REST endpoints | kebab-case nouns | `/api/group-members`, `/api/auth/refresh` |
| JPA entities | Singular noun | `User`, `Contact` |
| MongoDB docs | Singular noun | `Message`, `Conversation` |
| DTOs | `{Domain}Request` / `{Domain}Response` | `SendMessageRequest`, `UserResponse` |
| Mappers | `{Domain}Mapper` | `MessageMapper` |
| Enums | PascalCase class, UPPER_SNAKE values | `MessageStatus.DELIVERED` |
| Test classes | `{Class}Test` | `MessageServiceTest` |

All identifiers, comments, and Javadoc **must be in English**.

---

## 4. REST API Design

- All routes are prefixed `/api/`.
- Use standard HTTP verbs: `GET` read, `POST` create, `PUT` full update, `PATCH` partial update, `DELETE` remove.
- All controllers return `ApiResponse<T>` — never raw `ResponseEntity<Map>` or plain objects.
- Validation via `@Valid` on request bodies + Bean Validation annotations on DTOs.
- Error responses use the global `@ControllerAdvice` in `exception/` — never construct error responses inline.
- Pagination: use Spring's `Pageable` for any list endpoint that may grow unbounded.
- Shared post actions live under `/api/posts/{postId}/share` and only mutate engagement counters; sharing content itself remains in the chat service.
- Post reports are created through `/api/reports` so moderation records can be stored independently from post engagement actions.

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
| `/topic/feed/{userId}` | server → client | New posts for the user's home feed |
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
- All entities must have `@CreationTimestamp` and `@UpdateTimestamp` via Hibernate.
- Use `UUID` as primary key type, generated with `@GeneratedValue(strategy = GenerationType.UUID)`.
- Never use `FetchType.EAGER` — default to `LAZY`, fetch explicitly when needed.
- Store enums as strings with `@Enumerated(EnumType.STRING)`.

**MongoDB**
- All `@Document` classes must declare `@CompoundIndex` for any field pair queried together.
- Use Spring Data auditing: `@CreatedDate` and `@LastModifiedDate`.
- Use `String` as `id` type (auto-generated by Spring Data).

**Redis**
- Key format: `{domain}:{id}:{qualifier}` — e.g. `presence:user:abc123`, `blacklist:token:xyz`.
- Always set a TTL. Never store open-ended keys.

---

## 8. Code Style & Quality

- **Lombok:** use `@RequiredArgsConstructor` for constructor injection — never `@Autowired` on fields.
- **MapStruct:** all entity↔DTO conversions go through a `Mapper` interface — no manual `new SomeDto(entity.getX(), ...)` calls.
- **Exception handling:** throw `AppException(ErrorCode.*)` from services; let `@ControllerAdvice` translate to HTTP status + `ApiResponse<Void>`.
- **Service method size:** if a method exceeds ~50 lines, extract private helper methods or split into sub-services.
- **Test coverage:** every `Service` class must have a corresponding unit test in `src/test/`. WebSocket handlers must have integration tests.

---

## 9. Configuration

- Secrets (`jwt.secret`, DB passwords) **must** come from environment variables — never hardcode in any `.yml`.
- Use `application-dev.yml` for local defaults, `application-prod.yml` for production overrides.
- Add new config keys to both profiles and document them in the root `README.md` environment table.

---

## 10. Code Templates — Canonical Patterns

> AI agents and developers **must** follow these exact patterns when generating new code.

### 10.1 Controller Template

```java
@RestController
@RequestMapping("/api/foos")
@RequiredArgsConstructor
public class FooController {

    private final FooService fooService;

    @PostMapping
    ApiResponse<FooResponse> create(@RequestBody @Valid CreateFooRequest request) {
        return ApiResponse.<FooResponse>builder()
                .result(fooService.create(getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping("/{id}")
    ApiResponse<FooResponse> getById(@PathVariable String id) {
        return ApiResponse.<FooResponse>builder()
                .result(fooService.getById(id, getAuthenticatedUserId()))
                .build();
    }

    @GetMapping
    ApiResponse<List<FooResponse>> getAll(Pageable pageable) {
        return ApiResponse.<List<FooResponse>>builder()
                .result(fooService.getAll(getAuthenticatedUserId(), pageable))
                .build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> delete(@PathVariable String id) {
        fooService.delete(id, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    // Canonical auth helper — always returns String, never UUID
    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
```

### 10.2 Service Template

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class FooService {

    private final FooRepository fooRepository;
    private final FooMapper fooMapper;

    @Transactional
    public FooResponse create(String userId, CreateFooRequest request) {
        // Business validation
        if (fooRepository.existsByNameAndUserId(request.getName(), UUID.fromString(userId))) {
            throw new AppException(ErrorCode.FOO_ALREADY_EXISTS);
        }

        Foo foo = fooMapper.toEntity(request);
        foo.setUserId(UUID.fromString(userId));

        Foo saved = fooRepository.save(foo);
        log.info("Created foo id={} for user={}", saved.getId(), userId);

        return fooMapper.toResponse(saved);
    }

    public FooResponse getById(String id, String userId) {
        Foo foo = fooRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new AppException(ErrorCode.FOO_NOT_FOUND));

        return fooMapper.toResponse(foo);
    }
}
```

### 10.3 Request DTO Template

```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateFooRequest {

    @NotBlank(message = "INVALID_KEY")
    @Size(max = 255, message = "FOO_NAME_TOO_LONG")
    private String name;

    @Size(max = 1000, message = "FOO_DESCRIPTION_TOO_LONG")
    private String description;
}
```

### 10.4 Response DTO Template

```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FooResponse {
    private String id;
    private String name;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
```

### 10.5 JPA Entity Template

```java
@Entity
@Table(name = "foos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Foo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
```

### 10.6 MongoDB Document Template

```java
@Document(collection = "foos")
@CompoundIndex(def = "{'userId': 1, 'createdAt': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Foo {

    @Id
    private String id;

    private String userId;
    private String name;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

### 10.7 MapStruct Mapper Template

```java
@Mapper(componentModel = "spring")
public interface FooMapper {
    FooResponse toResponse(Foo foo);
    Foo toEntity(CreateFooRequest request);
}
```

### 10.8 Repository Template

```java
// PostgreSQL
public interface FooRepository extends JpaRepository<Foo, UUID> {
    Optional<Foo> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByNameAndUserId(String name, UUID userId);
    Page<Foo> findByUserId(UUID userId, Pageable pageable);
}

// MongoDB
public interface FooRepository extends MongoRepository<Foo, String> {
    Page<Foo> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
```

### 10.9 Exception Pattern

```java
// In service — throw domain errors
throw new AppException(ErrorCode.FOO_NOT_FOUND);
throw new AppException(ErrorCode.FOO_ALREADY_EXISTS);

// In ErrorCode enum — add new codes
FOO_NOT_FOUND(1400, "Foo not found", HttpStatus.NOT_FOUND),
FOO_ALREADY_EXISTS(1401, "Foo already exists", HttpStatus.CONFLICT),
```

### 10.10 Unit Test Template

```java
@ExtendWith(MockitoExtension.class)
class FooServiceTest {

    @Mock
    private FooRepository fooRepository;

    @Mock
    private FooMapper fooMapper;

    @InjectMocks
    private FooService fooService;

    @Test
    void create_shouldReturnResponse_whenValid() {
        // Arrange
        var request = CreateFooRequest.builder().name("Test").build();
        var entity = Foo.builder().id(UUID.randomUUID()).name("Test").build();
        var response = FooResponse.builder().id(entity.getId().toString()).name("Test").build();

        when(fooRepository.existsByNameAndUserId(any(), any())).thenReturn(false);
        when(fooMapper.toEntity(request)).thenReturn(entity);
        when(fooRepository.save(entity)).thenReturn(entity);
        when(fooMapper.toResponse(entity)).thenReturn(response);

        // Act
        var result = fooService.create("user-id", request);

        // Assert
        assertThat(result.getName()).isEqualTo("Test");
        verify(fooRepository).save(entity);
    }

    @Test
    void getById_shouldThrow_whenNotFound() {
        when(fooRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fooService.getById("id", "user-id"))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FOO_NOT_FOUND);
    }
}
```

---

## 11. Do & Don't Guidelines

### DO

| # | Rule |
|---|---|
| 1 | Return `ApiResponse<T>` from every controller method |
| 2 | Use `@RequiredArgsConstructor` for all dependency injection |
| 3 | Use `@Transactional` on service methods that modify state |
| 4 | Use `@Valid` on all `@RequestBody` parameters |
| 5 | Return `String` from `getAuthenticatedUserId()` — convert to `UUID` in service |
| 6 | Use `AppException(ErrorCode.*)` for all business errors |
| 7 | Use MapStruct for all entity↔DTO mapping |
| 8 | Add `@Slf4j` to every service class |
| 9 | Use `FetchType.LAZY` for all JPA relationships |
| 10 | Define constants as `static final` fields — no magic numbers |

### DON'T

| # | Rule | Why |
|---|---|---|
| 1 | Don't use `@Autowired` on fields | Use constructor injection via Lombok |
| 2 | Don't return `ResponseEntity<Map>` from controllers | Use `ApiResponse<T>` wrapper |
| 3 | Don't expose JPA entities in API responses | Always map to DTOs |
| 4 | Don't put business logic in controllers | Delegate to services |
| 5 | Don't inject repositories into controllers | Controllers → Services → Repositories |
| 6 | Don't catch exceptions in controllers | Let `@ControllerAdvice` handle them |
| 7 | Don't log JWT tokens, passwords, or PII | Security violation |
| 8 | Don't hardcode secrets in `.yml` files | Use environment variables |
| 9 | Don't use `FetchType.EAGER` | Causes N+1 queries |
| 10 | Don't write manual DTO mapping | Use MapStruct |
| 11 | Don't use Vietnamese in code, comments, or Javadoc | English only |
| 12 | Don't use wildcard security permits (`/api/**`) | Explicitly list endpoints |

---

## 12. Checklist before committing

- [ ] No business logic in controllers
- [ ] All controller methods return `ApiResponse<T>`
- [ ] `getAuthenticatedUserId()` returns `String` (not `UUID`)
- [ ] New endpoint added to `WebSecurityConfig`
- [ ] DTO used (entity not exposed in response)
- [ ] MapStruct mapper updated if model changed
- [ ] No secrets in `.yml` files
- [ ] `@Transactional` on state-changing service methods
- [ ] Unit test added or updated for changed service
- [ ] English-only identifiers and comments
- [ ] No `@Autowired` on fields
- [ ] No magic numbers — constants defined

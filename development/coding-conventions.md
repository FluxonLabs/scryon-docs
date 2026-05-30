# Coding conventions

Scryon's code is opinionated. These are the conventions every PR is reviewed against.

## Java

- **Language level: Java 21.** Use records, pattern matching, `var`, switch expressions liberally.
- **No Lombok.** Records and `@Service` + constructor injection beat boilerplate.
- **Constructor injection only.** No field injection (`@Autowired` on fields is forbidden).
- **`final` everywhere it's free** — fields, parameters, locals where it reads cleanly.
- **One public class per file.** Java enforces this; don't fight it with package-private grab-bag files.
- **Static helpers go on classes, not in `*Utils`** unless the helper is truly generic (e.g. `Maps.entry`).

## Naming

| Kind | Convention |
|---|---|
| Service | `SomethingService` (verb-y noun). |
| Client | `SomethingClient` for external HTTP integrations. |
| Controller | `SomethingController`. |
| DTO / record | `SomethingRequest`, `SomethingResponse`, `SomethingDto` (rare). |
| Repository | `SomethingRepository` (Spring Data). |
| Enum value | `UPPER_SNAKE_CASE`. |
| Constants | `UPPER_SNAKE_CASE`. |

## Packages

The codebase is **package-by-feature**: `calls`, `voice`, `diarization`, `speakers`, `actions`, `analysis`, `users`, `observability`, etc. Add new code under the feature it belongs to. Cross-feature utilities go in `common`.

> The article [Spring Boot Project Structure Explained](https://medium.com/@anandjeyaseelan10/spring-boot-project-structure-explained-best-practices-c2ba46ea57eb) recommends package-by-feature for larger apps; Scryon follows that advice deliberately.

Inside each feature, the standard sub-packages are:

| Sub-package | What |
|---|---|
| _(feature root)_ | Service classes, interfaces, configuration. |
| `dto/` | Request / response shapes. |
| `entity/` | JPA entities (sometimes alongside the service if there's only one). |

## Configuration

- All configuration goes through `ScryonProperties` (a `@ConfigurationProperties("scryon")` class with nested static classes per feature).
- Defaults live in `application.yml` with `${ENV_VAR:default}` placeholders.
- **No hard-coded URLs, keys, or timeouts** anywhere except `application.yml`.

## Logging

- Use `org.slf4j.Logger` via `LoggerFactory.getLogger(...)`. Never `System.out.println`.
- Use **key=value structured logs**. `log.info("event=X k1={} k2={}", v1, v2)`.
- Use the MDC fields — they're attached automatically by `RequestLoggingFilter` and `PipelineMdc`.
- `INFO` lines should be greppable, sparse, and useful. `DEBUG` is fine for verbose stuff.
- **Never log PII** without going through `SafeLogSanitizer`.

## Error handling

- Domain exceptions extend a small hierarchy under `common/`. Each has a stable `code` field.
- `GlobalExceptionHandler` maps every domain exception to an HTTP status + `ApiError` body.
- **Soft-fail observability tasks.** A failure in metrics / Sentry never breaks a request.
- **Hard-fail business logic.** If you can't compute the right answer, fail loudly.

## Transactions

- `@Transactional` on service methods that read **and** write. Reads-only get `@Transactional(readOnly = true)`.
- The pipeline `@Service` boundary owns transactions. Don't open one inside an observation/metric block.
- `CallProcessingEventWriter` uses `@Transactional(propagation = REQUIRES_NEW)` so observability writes don't block on business transactions.

## HTTP clients

- All external HTTP goes through Spring `WebClient`. No `RestTemplate`.
- Configure timeouts explicitly (`connectTimeout`, `responseTimeout`). Production reality is "5xx are 5+ second slow".
- Log `event=HTTP_CLIENT host=... path=... status=... durationMs=...` for every call.

## Tests

See [Testing](testing.md).

## Comments

- **Comment why, not what.** The code shows what.
- **No TODOs without a tracking issue.** `// TODO(#42): ...`.
- **No commented-out code.** Delete it; git remembers.
- **JavaDoc** on every public service class and method. JavaDoc on private methods only when the intent isn't obvious.

## Formatting

- Indent with 4 spaces. No tabs.
- Soft 120-column wrap.
- Imports grouped: java.* → javax.* → external → com.scryon. No wildcards.
- One blank line between methods. Two between major sections inside a class.

## Anti-patterns

- ❌ Static state in services.
- ❌ Returning `null` from a public method. Use `Optional`.
- ❌ Catching `Exception` and continuing silently.
- ❌ Hand-rolled JSON when Jackson does it.
- ❌ String concatenation in SQL.

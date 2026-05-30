# Testing

Scryon's test suite is fast, hermetic, and runs in under a minute. Tests run with the `local` Spring profile against an in-memory H2 database — no Docker required.

## Layers

| Layer | Runtime | Purpose |
|---|---|---|
| Unit tests | JUnit 5, Mockito | One class at a time; no Spring context. |
| Slice tests | `@WebMvcTest`, `@DataJpaTest` | Single layer with light auto-config. |
| Integration tests | `@SpringBootTest` + `@ActiveProfiles("local")` | Full Spring context, in-memory DB. |

## Running tests

```bash
# All tests
./mvnw test

# A single test class
./mvnw test -Dtest='SpeakerNameResolutionServiceTest'

# A single test method
./mvnw test -Dtest='SpeakerNameResolutionServiceTest#positionalFallbackIncomingNamesFirstSpeakerAsUser'
```

## Conventions

- **Tests live next to the code under test.** `src/test/java/com/scryon/speakers/SpeakerNameResolutionServiceTest.java` mirrors `src/main/java/com/scryon/speakers/SpeakerNameResolutionService.java`.
- **One behaviour per test.** Multiple assertions on the same behaviour are fine; multiple behaviours per test is not.
- **Names describe behaviour.** `speakerGreetingContactIsLabelledUserAtHighConfidence`, not `testResolve`.
- **Helpers at the bottom of the file.** Test factories (`speaker(...)`, `seg(...)`, `transcript(...)`) make the body readable.
- **Use AssertJ.** `assertThat(x).isEqualTo(y)` reads better than `assertEquals(y, x)`.

## Mocking

- Default to real objects. Mocks for collaborators only (`AnalysisClient`, `DiarizationClient`, `TranscriptionClient`).
- Spring `@MockBean` for integration tests; `Mockito.mock(...)` for unit tests.
- Avoid mocking value types and records.

## Provider mocking

External providers are mocked in integration tests via `@MockBean`:

```java
@MockBean private TranscriptionClient transcriptionClient;
@MockBean private AnalysisClient analysisClient;
```

Stubs return canned `LemonfoxVerboseResponse` and `ScryonAnalysis` fixtures.

## Async behaviour

For `@SpringBootTest` tests that exercise the async pipeline, use the `waitForTerminal` helper:

```java
private void waitForTerminal(UUID id) throws InterruptedException {
    long deadline = System.currentTimeMillis() + 8_000L;
    while (System.currentTimeMillis() < deadline) {
        CallRecord row = repo.findById(id).orElse(null);
        if (row != null && row.getStatus() != null && row.getStatus().isTerminal()) return;
        TimeUnit.MILLISECONDS.sleep(50);
    }
}
```

## Snapshot tests

For transcript and analysis JSON shapes, prefer **structural assertions** over byte-for-byte snapshots:

```java
assertThat(body.get("speakers").size()).isEqualTo(2);
assertThat(body.get("speakers").get(0).get("role").asText()).isEqualTo("USER");
```

Byte-equality snapshots are brittle when the LLM output evolves; structural assertions survive the noise.

## Profiles in tests

| Profile | When |
|---|---|
| `local` | All integration tests. H2 in-memory, local filesystem storage. |

`@SpringBootTest` without `@ActiveProfiles` falls back to default, which tries to talk to Postgres — don't do that.

## Coverage

There is no enforced coverage threshold today. The bar is: **every public method and every branch of business logic must have a test**. Reviewers will push back on uncovered changes.

## Long-running provider tests

If you need to exercise a real provider (e.g. before a major prompt change), put the test under `src/test/integration/` and gate it on an env var:

```java
@EnabledIfEnvironmentVariable(named = "SCRYON_RUN_PROVIDER_TESTS", matches = "true")
```

These never run in CI; you run them locally.

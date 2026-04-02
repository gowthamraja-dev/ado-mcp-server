# Testing Practices

## Current State Summary
- No first-party test files are present under `src/` or dedicated test directories.
- `package.json` has no `test` script and no test framework dependencies (only `typescript`, `tsx`, and Node types in devDependencies).
- A repository-wide pattern search for common test DSLs only matched non-test usage of the word `describe` in `zod` schemas within `src/index.ts`.
- Coverage is therefore effectively 0% from an automated test perspective for project-owned code.

## Existing Quality Signals (Non-test)
- Strict TypeScript compilation (`"strict": true` in `tsconfig.json`) provides static type safety.
- Build path is simple (`npm run build` => `tsc`), which can serve as a basic CI quality gate.
- Error pathways are at least structurally normalized via `errResult` in `src/index.ts`, making behavior testable once a framework is introduced.

## Suggested Test Framework and Runner
- Recommended baseline: Node native test runner (`node:test`) for minimal dependency overhead, or `vitest` for richer DX.
- For this codebase size, either is acceptable; priority is quick adoption and CI integration.
- If staying minimal:
- Keep dependencies small and use Node 20 features already required by `package.json`.
- If optimizing productivity:
- Use `vitest` for mocks/spies and cleaner async assertions around `fetch`.

## Proposed Test File Layout
- Unit tests:
- `src/config.test.ts` for `loadAdoEnv`, `isAdoEnvComplete`, and `envErrorJson`.
- `src/ado-api.test.ts` for pure helpers and client behavior with mocked `fetch`.
- `src/index.test.ts` for tool handler response formatting and env-gating behavior.
- Optional integration tests:
- `tests/integration/ado-api.integration.test.ts` guarded by env vars and skipped by default.
- Keep test files colocated or in `tests/`; choose one convention and enforce consistently.

## High-value Initial Test Cases
- `src/config.ts`:
- Returns empty strings when env vars are absent.
- Correctly identifies complete vs incomplete config.
- Emits stable error payload shape for missing config.
- `src/ado-api.ts`:
- `normalizeCommentText` whitespace normalization.
- `parseAzureDevOpsPrUrl` valid and invalid URL permutations.
- Retry behavior in `request` on 429/502/503/504 and stop on non-retriable status.
- `linkPullRequestToWorkItem` idempotency when relation already exists.
- `src/index.ts`:
- `errResult` mapping for `AdoApiError` vs generic `Error`.
- Tool handlers return `envErrorJson` when config is incomplete.
- Tool output remains JSON text content shape expected by MCP transport.

## Fixtures and Mocks Strategy
- Mock `global.fetch` in tests for `AdoClient.request` branches (ok JSON, ok text, API failure, network failure).
- Use deterministic fake responses for Azure DevOps payload slices instead of full large fixtures.
- Provide a shared factory for `AdoEnvConfig` test input to avoid repeated literals.
- Avoid real PAT/org/project in fixtures; use synthetic placeholders only.

## Coverage and CI Recommendations
- Add scripts in `package.json`:
- `test` to run the chosen framework.
- `test:coverage` to generate statement/branch/function coverage reports.
- `typecheck` as explicit quality gate even if build already compiles.
- Set short-term coverage floor:
- 80%+ for `src/config.ts` and utility functions in `src/ado-api.ts`.
- Behavior-based coverage for tool handlers in `src/index.ts` (focus on success/error branching).

## Gaps and Risk Areas
- Highest risk: API behavior regressions in retry/idempotency logic in `src/ado-api.ts` with no safety net.
- Medium risk: output contract drift in MCP tool responses from `src/index.ts`.
- Medium risk: URL parsing and relation-link edge cases without regression tests.
- Lower risk: environment config loading in `src/config.ts`, but still important to lock down.

## Practical Next Steps
- Add a test runner and minimal test scripts in `package.json`.
- Implement fast unit tests for `config` and parser/normalizer helpers first.
- Add fetch-mocked tests for retry and link logic in `AdoClient`.
- Add at least one smoke-style test for each MCP tool registration path in `src/index.ts`.

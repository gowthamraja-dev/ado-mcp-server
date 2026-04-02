# Testing Patterns

## Current State
- There is currently no automated test directory or test runner configuration in this repo.
- `package.json` defines `build`, `start`, and `dev` scripts only; there is no `test` script.
- No test framework dependency (such as Vitest/Jest/Mocha) is present in `package.json`.

## Existing Quality Signals
- Type safety is the primary enforced quality gate via `"strict": true` in `tsconfig.json`.
- Runtime behavior is organized into testable units in `src/ado-api.ts` (pure helpers + side-effecting client methods).
- Tool-level contracts are schema-validated in `src/index.ts` using Zod, reducing invalid input paths.

## Testable Units Already Present
- Pure parsing helpers in `src/ado-api.ts` are strong unit-test candidates:
  - `parseAzureDevOpsPrUrl()`
  - `parseGithubPrUrl()`
  - `normalizeCommentText()`
  - `buildPullRequestArtifactUrl()`
  - `urlComparable()` and `vstfsComparable()`
- Field extraction helpers in `src/ado-api.ts` are deterministic:
  - `pickString()`
  - `pickDescription()`
  - `pickAssignedTo()`

## Integration-Focused Targets
- `AdoClient.request()` in `src/ado-api.ts` should be tested for:
  - Retry on status `429`, `502`, `503`, `504`
  - Non-retry on fatal statuses
  - JSON parse fallback behavior for non-JSON text bodies
- `AdoClient.linkPullRequestToWorkItem()` in `src/ado-api.ts` should be tested for:
  - Azure DevOps vs GitHub URL branching
  - Duplicate relation detection idempotency
  - Org/project mismatch guardrails
- `AdoClient.processCommitMessage()` in `src/ado-api.ts` should be tested for:
  - No `#id` match path
  - Valid `#123` extraction path
  - Optional `prUrl` linking path

## MCP Tool-Level Targets
- Tool handlers in `src/index.ts` can be exercised with mocked `AdoClient` behavior:
  - `ado_get_work_item`
  - `ado_list_comments`
  - `ado_add_comment`
  - `ado_update_comment`
  - `ado_link_pr_to_work_item`
  - `ado_process_commit_message`
- Error-shaping behavior should be asserted through `errResult()` and env gating via `createClient()` + `envErrorJson()` in `src/index.ts` and `src/config.ts`.

## Suggested Baseline Testing Setup (Not Yet Implemented)
- Add a `test` script to `package.json` and a single framework (Vitest is a natural fit for ESM TypeScript).
- Keep fast unit tests beside sources (for example `src/ado-api.test.ts`) and isolate API-call paths with fetch mocks.
- Add at least one smoke test for server registration surface in `src/index.ts` to prevent tool contract regressions.

## Coverage Priorities
- Priority 1: URL parsing and work-item extraction correctness in `src/ado-api.ts`.
- Priority 2: Retry and idempotency semantics in `src/ado-api.ts`.
- Priority 3: MCP tool response envelopes in `src/index.ts` (`ok`, `error`, and payload shape consistency).

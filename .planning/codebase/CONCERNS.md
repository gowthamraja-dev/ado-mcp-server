# Concerns Mapping

## Top Risks (Prioritized)

1. Missing automated test coverage for critical API and idempotency logic
- Evidence: No test files are present in repository file list (`rg --files` shows only `src/*.ts` and config files).
- Evidence: Core behavior branches in `src/ado-api.ts` (`request`, retry path, duplicate comment suppression, PR URL parsing, relation patching) are unverified.
- Impact: Regressions in commit automation, PR linking, and comment idempotency can silently break CI workflows and produce duplicate/incorrect ADO mutations.
- Likelihood: High (multiple logic branches, no guards via tests).
- Mitigation: Add unit tests for `parseAzureDevOpsPrUrl`, `normalizeCommentText`, retry behavior, and `processCommitMessage`; add mocked integration tests for `AdoClient` request/response flows.

2. Operational fragility from dependency on Azure DevOps preview API
- Evidence: `COMMENTS_API` is pinned to preview version `7.1-preview.3` in `src/ado-api.ts`.
- Impact: Upstream API shape/behavior changes may break comments endpoints unexpectedly.
- Likelihood: Medium-High (preview contracts are less stable than GA).
- Mitigation: Isolate comments response parsing behind stricter runtime schema validation and add fallback/compat handling for missing fields.

3. Security/abuse risk: unrestricted comment text and commit message passthrough
- Evidence: `processCommitMessage` in `src/ado-api.ts` writes `Updated via commit: ${commitMessage}` directly to ADO comments.
- Evidence: `ado_add_comment` and `ado_update_comment` in `src/index.ts` accept arbitrary `text` with only `z.string().min(1)` validation.
- Impact: Overly large or malformed comment payloads can create noisy work items, leak sensitive commit text, or hit API limits/rate limits.
- Likelihood: Medium.
- Mitigation: Introduce max length validation, optional redaction patterns, and normalization/sanitization policy for generated comments.

4. Performance concentration: duplicate suppression requires full comment listing per add
- Evidence: `addComment` in `src/ado-api.ts` calls `listComments(workItemId)` before POST when `skipIfDuplicate` is true.
- Evidence: `listComments` default fetch depth is up to 200 (`src/index.ts` defaults top to 200; `src/ado-api.ts` default parameter).
- Impact: Extra round-trips and larger payload processing per comment add, with increased latency on heavily commented work items.
- Likelihood: Medium.
- Mitigation: Cache recent normalized comments per work item for request lifetime, reduce default `$top`, or support server-side idempotency key strategy if available.

5. Reliability gap in retry strategy for network failures
- Evidence: `request` in `src/ado-api.ts` retries on status codes 429/502/503/504 and on thrown fetch errors, but ignores `Retry-After` header.
- Impact: Can retry too aggressively or too slowly under throttling, increasing failure rates and unnecessary load.
- Likelihood: Medium.
- Mitigation: Parse and honor `Retry-After`, cap total retry budget, and emit structured retry telemetry.

6. Maintainability risk: large monolithic API client with mixed concerns
- Evidence: `src/ado-api.ts` combines HTTP transport, retry policy, URL parsing, business operations, and normalization helpers in one file.
- Impact: Harder to reason about changes; high chance of cross-impact bugs during feature additions.
- Likelihood: Medium.
- Mitigation: Split into modules (`transport`, `work-items`, `comments`, `pr-links`, `parsers`) with focused unit tests.

## Quick Wins (Low Effort, High Return)
- Add a test harness (Vitest/Jest) and cover parser/idempotency branches in `src/ado-api.ts`.
- Add zod constraints for comment size and commit message size in `src/index.ts` tool schemas.
- Honor `Retry-After` in `src/ado-api.ts` retry loop.
- Expand `README.md` with required env vars, expected PR URL format, and failure modes.

## Deeper Refactors (Higher Effort)
- Introduce typed response validation per endpoint (zod schemas) before using fields in `src/ado-api.ts`.
- Create an abstraction boundary for HTTP client and inject fetch for deterministic testing.
- Break `src/ado-api.ts` into smaller modules and add contract tests for ADO edge cases.
- Add structured logging and correlation IDs around tool entry points in `src/index.ts`.

## Risk Concentration Summary
- Highest concentration is in `src/ado-api.ts` where network, parsing, retries, and mutation logic converge.
- Secondary concentration is at MCP tool boundaries in `src/index.ts` due to minimal input constraints.
- Project-level risk is elevated by absent tests and minimal runbook/documentation (`README.md`).

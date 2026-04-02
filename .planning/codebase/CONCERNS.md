# CONCERNS

## Scope
- Repository inspected: `src/index.ts`, `src/ado-api.ts`, `src/config.ts`, `package.json`, `README.md`.
- Focus: operational risk, security exposure, fragility, and technical debt visible in current code.

## High-Risk Concerns
1. Error payloads from Azure DevOps are echoed back to MCP clients with minimal redaction.
- Evidence: `src/ado-api.ts` builds `AdoApiError` with response text content (`text.slice(0, 500)`) in the message and full `text` in `body` at lines 139-143.
- Evidence: `src/index.ts` returns `AdoApiError.message` directly in tool results at lines 29-35.
- Risk: upstream response bodies can leak internal API details or reflected user data into model/tool outputs.

2. No request timeout/cancellation for outbound API calls.
- Evidence: `src/ado-api.ts` `request()` uses `fetch(url, init)` without `AbortSignal` or timeout wrapper at lines 124-126.
- Risk: slow or hanging network calls can stall MCP tool execution and degrade reliability under partial outages.

3. Idempotency check for comment posting is bounded to first page defaults and can miss duplicates.
- Evidence: duplicate suppression path in `src/ado-api.ts` calls `listComments(workItemId)` without passing a larger window at line 230.
- Evidence: `listComments` defaults `top = 200` at line 196 and only queries one page via `$top` at line 198.
- Risk: older duplicate comments beyond returned window are not detected, causing repeated automation noise.

## Medium-Risk Concerns
1. Commit message parsing takes the first `#<digits>` match only and lacks tighter intent validation.
- Evidence: `src/ado-api.ts` uses `/#(\d+)/.exec(commitMessage)` at line 391.
- Risk: unrelated references inside commit text can trigger comment/link automation on wrong work items.

2. Link creation is not guarded by optimistic concurrency and can race.
- Evidence: `src/ado-api.ts` checks existing relations (`getWorkItemRaw`) then performs patch add in separate calls at lines 321-332 and 349-360.
- Risk: concurrent runs can both pass pre-check and attempt duplicate relation writes.

3. Uses preview API version for comments.
- Evidence: `COMMENTS_API = "7.1-preview.3"` in `src/ado-api.ts` line 4.
- Risk: API contract drift can break parsing/behavior without code changes.

## Operational Debt
1. No automated test suite configured.
- Evidence: `package.json` scripts include only `build`, `start`, and `dev`; no `test` script.
- Risk: regressions in parsing/retry/idempotency paths are likely to ship unnoticed.

2. No structured logging/telemetry for API retry and failure paths.
- Evidence: `src/ado-api.ts` retry logic (lines 111-152) has no logging hooks.
- Evidence: `src/index.ts` returns errors to callers but does not emit operational logs (lines 29-39).
- Risk: production troubleshooting is difficult, especially for transient API failures.

3. Configuration validation checks presence but not quality/scope guidance.
- Evidence: `src/config.ts` `isAdoEnvComplete` only checks non-empty values at lines 18-20.
- Evidence: `README.md` lists env vars but no PAT scope hardening guidance.
- Risk: mis-scoped credentials and misconfiguration are harder to detect before runtime failures.

## Fragile Spots
- URL parsers are strict to exact hostnames/path layouts.
- Evidence: `parseAzureDevOpsPrUrl` requires `u.hostname === "dev.azure.com"` and `_git/pullrequest` path assumptions at lines 502-507 in `src/ado-api.ts`.
- Evidence: `parseGithubPrUrl` requires `u.hostname === "github.com"` and `/pull/<id>` shape at lines 522-525 in `src/ado-api.ts`.
- Impact: valid enterprise/alternate host variants are rejected, reducing interoperability.

## Suggested Mitigations (next pass)
- Redact upstream error bodies before returning MCP payloads; keep full body only in internal logs.
- Add per-request timeout via `AbortController` and expose configurable retry budget.
- Make duplicate detection pagination-aware or use stronger idempotency keying.
- Add tests for commit parsing, URL parsing, retry behavior, and duplicate suppression edge cases.
- Add minimally structured logs around retries, status codes, and relation/comment mutations.

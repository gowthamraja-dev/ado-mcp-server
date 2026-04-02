# Architecture Mapping

## System Type
- The repository implements a single-process MCP server for Azure DevOps automation.
- Runtime entrypoint is `src/index.ts`, compiled to `dist/index.js` via `tsc` from `package.json` scripts.
- Transport is stdio through `StdioServerTransport` from `@modelcontextprotocol/sdk`.

## Core Components
- `src/index.ts`: server composition and tool registration layer.
- `src/ado-api.ts`: Azure DevOps HTTP client and domain logic for work items, comments, PR linking, and commit processing.
- `src/config.ts`: environment loading and validation for `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT`.

## Runtime Flow
- Process starts in `src/index.ts` and constructs `McpServer` with name/version metadata.
- Each MCP tool in `src/index.ts` validates input with `zod`, creates an `AdoClient` from `loadAdoEnv()`, and calls a method in `src/ado-api.ts`.
- `createClient()` returns `null` when env is incomplete; tool handlers return `envErrorJson()` from `src/config.ts` in that case.
- Successful responses are normalized through `toolResult()` in `src/index.ts` and always serialized as text JSON payloads.
- Errors from API calls are normalized via `errResult()`; `AdoApiError` status/body details are surfaced.

## Integration Boundaries
- External dependency boundary is Azure DevOps REST endpoints (`_apis/wit`, `_apis/git`, `_apis/projects`) in `src/ado-api.ts`.
- Authentication is PAT Basic auth header generation in `basicAuthHeader()` inside `src/ado-api.ts`.
- No database, cache, queue, or filesystem persistence layer is present in `src/`.

## Domain Operations
- Work item read model: `getWorkItemDetails()` in `src/ado-api.ts` maps raw fields to a stable response shape.
- Comment operations: `listComments()`, `addComment()`, `updateComment()` in `src/ado-api.ts`.
- Idempotency rule: duplicate suppression in `addComment()` uses `normalizeCommentText()`.
- PR relation operations: `linkPullRequestToWorkItem()` supports ADO PR URLs as `ArtifactLink` and GitHub PR URLs as `Hyperlink`.
- Commit automation: `processCommitMessage()` extracts `#<id>`, posts commit-derived comment, then optionally links PR.

## Resilience and Error Strategy
- HTTP layer retry policy is centralized in `AdoClient.request()` (`MAX_RETRIES=5`, exponential backoff with jitter).
- Retry status set is explicit: 429, 502, 503, 504 via `shouldRetryStatus()`.
- Non-retriable failures throw `AdoApiError` with bounded response body preview.

## Architectural Notes
- Current architecture is intentionally thin: one orchestration layer (`src/index.ts`) and one service client (`src/ado-api.ts`).
- Parsing/normalization utilities in `src/ado-api.ts` (URL parsing, GUID normalization, comparable URLs) isolate protocol-specific details.
- Configuration concerns are separated cleanly into `src/config.ts`, avoiding credential hardcoding and keeping tool handlers stateless.

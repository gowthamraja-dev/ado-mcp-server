# INTEGRATIONS

## Integration Inventory
- Primary external integration is Azure DevOps REST APIs via `https://dev.azure.com/...` from `src/ado-api.ts`.
- Primary internal integration is MCP host <-> server over stdio via `@modelcontextprotocol/sdk` in `src/index.ts`.
- No additional third-party SaaS integrations are referenced in current source files.

## Internal Service Boundaries
- MCP surface layer: `src/index.ts`.
- Responsibility: register tools, validate input (`zod`), serialize outputs, map errors.
- Azure DevOps client layer: `src/ado-api.ts`.
- Responsibility: REST URL construction, auth headers, retries, parsing, idempotency checks.
- Configuration boundary: `src/config.ts`.
- Responsibility: load/validate environment and produce standardized config errors.

## External APIs and Endpoints
- Work Item Tracking API (`WIT_API = 7.1`) used for:
- GET work item details (`/_apis/wit/workitems/{id}`).
- PATCH work item relations to add PR artifact links (`/_apis/wit/workitems/{id}`).
- Comments API (`COMMENTS_API = 7.1-preview.3`) used for:
- GET comments (`/_apis/wit/workItems/{id}/comments?$top=...`).
- POST comment create.
- PATCH comment update.
- Projects API (`PROJECTS_API = 7.1`) used for project GUID lookup (`/_apis/projects/{project}`).
- Git API (`GIT_API = 7.1`) used for repository GUID lookup (`/_apis/git/repositories/{repo}`).

## Authentication and Authorization
- Auth method: HTTP Basic with PAT in `Authorization` header (`basicAuthHeader()` in `src/ado-api.ts`).
- PAT source: `ADO_PAT` environment variable via `loadAdoEnv()` in `src/config.ts`.
- Tenant scoping:
- Org and project are loaded from `ADO_ORG` and `ADO_PROJECT`.
- PR linking validates URL org/project must match configured env values.
- No OAuth flow, token refresh, or delegated user auth in this codebase.

## MCP Tool-Level Integration Contracts
- `ado_ping`: process health only, no Azure API call.
- `ado_get_work_item`: reads title/description/state/assignedTo.
- `ado_list_comments`: reads non-deleted comments with optional `top` cap.
- `ado_add_comment`: can suppress duplicates by normalized text match.
- `ado_update_comment`: patches comment text by `commentId`.
- `ado_link_pr_to_work_item`: parses PR URL and creates ArtifactLink relation.
- `ado_process_commit_message`: parses `#<id>`, adds idempotent comment, optionally links PR.

## Data Boundaries and Transformations
- Inbound boundary: MCP tool arguments validated by `zod` schemas in `src/index.ts`.
- Outbound boundary: all tool responses normalized to JSON text payloads (`toolResult()`).
- Work item shaping: raw ADO fields are narrowed to a typed subset (`WorkItemDetails`).
- Comment normalization: whitespace normalization (`normalizeCommentText`) for idempotency.
- PR URL transformation:
- Parse human URL (`parseAzureDevOpsPrUrl`).
- Resolve project/repo GUIDs.
- Construct `vstfs:///Git/PullRequestId/...` artifact URL for relation patch.

## Failure Modes and Resilience
- Config failures: missing env vars short-circuit with explicit error JSON.
- API failures:
- Non-2xx returns throw `AdoApiError` with status and truncated body context.
- Retried statuses: `429`, `502`, `503`, `504` with exponential backoff + jitter.
- Non-API failures (network/runtime) are retried up to `MAX_RETRIES` then surfaced.
- Duplicate relation/comment behavior is idempotent and returns non-error "no change" style outcomes.
- URL validation failures (invalid PR URL or org/project mismatch) return structured non-throwing results.

## Key Config and Change Hotspots
- Environment and validation: `src/config.ts`.
- Tool registration/API contract changes: `src/index.ts`.
- Endpoint versions, retry policy, auth, and ADO data mapping: `src/ado-api.ts`.
- Build/runtime metadata: `package.json` and `tsconfig.json`.

## Operational Notes for Planning
- Integration risk centers on Azure DevOps API contracts and permissions of PAT scopes.
- Comments endpoint uses preview API version; this is the most likely version-churn point.
- Because transport is stdio, orchestration reliability depends on host process management, not HTTP infra in this repo.
- No persistent queue/store means transient failures are retried in-process only and then returned to caller.

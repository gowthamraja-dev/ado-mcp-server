# Architecture

## Layout

| Path | Role |
|------|------|
| `src/index.ts` | MCP server: registers tools, stdio transport, JSON responses |
| `src/config.ts` | Environment loading and validation helpers |
| `src/ado-api.ts` | `AdoClient`: HTTP to Azure DevOps REST APIs, retries, business helpers |

## HTTP

- Base URL pattern: `https://dev.azure.com/{org}/{project}/_apis/...` with URL-encoded org and project segments.
- **Work items**: `api-version=7.1` for WIT (`GET` work item; `PATCH` with `Content-Type: application/json-patch+json` for relations).
- **Comments**: `api-version=7.1-preview.3` on `.../wit/workItems/{id}/comments`.
- **Projects / Git**: `api-version=7.1` to resolve project and repository GUIDs for PR artifact URLs.

## PR artifact URL

Built as:

`vstfs:///Git/PullRequestId/{projectGuid}%2F{repositoryGuid}%2F{pullRequestId}`

Duplicate relations are detected by comparing **decoded, lowercased** `vstfs` URLs.

## Retries

Configurable loop: up to 5 attempts, base delay with exponential backoff and jitter, capped at 30s. Retries on specific HTTP statuses and on network errors from `fetch`.

## Comment idempotency

`normalizeCommentText`: trim and collapse internal whitespace. When adding with duplicate check enabled, existing comments are scanned for the same normalized text.

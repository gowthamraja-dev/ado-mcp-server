# Integration Mapping (`ado-mcp-server`)

## External Service: Azure DevOps REST APIs
- Primary integration target is Azure DevOps at `https://dev.azure.com` (`src/ado-api.ts`).
- Project-scoped base URL is composed in `projectRootUrl(org, project)` (`src/ado-api.ts`).
- Organization-scoped base URL is composed in `orgRootUrl(org)` (`src/ado-api.ts`).
- API versions are hard-coded constants: WIT `7.1`, Comments `7.1-preview.3`, Git `7.1`, Projects `7.1` (`src/ado-api.ts`).

## Authentication + Configuration Contract
- Authentication uses PAT via Basic auth header (`basicAuthHeader` in `src/ado-api.ts`).
- Required env vars are `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` (`src/config.ts`).
- Environment read and completeness validation occur in `loadAdoEnv` and `isAdoEnvComplete` (`src/config.ts`).
- Missing env handling returns structured error JSON (`envErrorJson` in `src/config.ts`).

## HTTP Client Behavior
- All calls use global `fetch` through `AdoClient.request` (`src/ado-api.ts`).
- Retry policy is applied for `429`, `502`, `503`, `504` (`shouldRetryStatus` in `src/ado-api.ts`).
- Backoff strategy is exponential with jitter and a 30s cap (`backoffMs`, `jitter`, `MAX_RETRIES` in `src/ado-api.ts`).
- Errors are normalized into `AdoApiError` with status/body capture (`src/ado-api.ts`).

## Azure DevOps Endpoint Coverage
- Work item fetch: `GET /_apis/wit/workitems/{id}` (`getWorkItemDetails` in `src/ado-api.ts`).
- Work item raw with relations: `GET ...?$expand=relations` (`getWorkItemRaw` in `src/ado-api.ts`).
- Comments list: `GET /_apis/wit/workItems/{id}/comments?$top=n` (`listComments` in `src/ado-api.ts`).
- Add comment: `POST /_apis/wit/workItems/{id}/comments` (`addComment` in `src/ado-api.ts`).
- Update comment: `PATCH /_apis/wit/workItems/{id}/comments/{commentId}` (`updateComment` in `src/ado-api.ts`).
- Add relation: `PATCH /_apis/wit/workitems/{id}` with JSON Patch (`addWorkItemRelation` in `src/ado-api.ts`).
- Resolve project ID: `GET /_apis/projects/{project}` (`getProjectId` in `src/ado-api.ts`).
- Resolve repository ID: `GET /_apis/git/repositories/{repo}` (`getRepositoryId` in `src/ado-api.ts`).

## URL Parsing + Linking Integrations
- Azure DevOps PR URL parsing is implemented by `parseAzureDevOpsPrUrl` (`src/ado-api.ts`).
- GitHub PR URL parsing is implemented by `parseGithubPrUrl` (`src/ado-api.ts`).
- Azure DevOps PR links are converted to `vstfs:///Git/PullRequestId/...` artifact URLs (`buildPullRequestArtifactUrl` in `src/ado-api.ts`).
- Relation type for Azure DevOps PR is `ArtifactLink` (`linkPullRequestToWorkItem` in `src/ado-api.ts`).
- Relation type for GitHub PR is `Hyperlink` with a descriptive comment attribute (`linkPullRequestToWorkItem` in `src/ado-api.ts`).
- Duplicate relation suppression uses normalized URL comparators (`vstfsComparable`, `urlComparable` in `src/ado-api.ts`).

## MCP Integration Surface (Consumer-facing)
- MCP server bootstrapping uses `McpServer` + `StdioServerTransport` (`src/index.ts`).
- Tool schemas and validation use `zod` in each `server.tool(...)` definition (`src/index.ts`).
- Business integration boundary is `AdoClient` created via `createClient()` (`src/index.ts`).
- Tool-level error mapping converts `AdoApiError` to JSON response payloads (`errResult` in `src/index.ts`).

## Automation Flow Integration
- Commit message automation parses `#<id>` references (`processCommitMessage` in `src/ado-api.ts`).
- It posts idempotent comments (`addComment` + `normalizeCommentText` in `src/ado-api.ts`).
- Optional PR URL from automation is linked through the same relation flow (`processCommitMessage` in `src/ado-api.ts`).
- This behavior is exposed to MCP clients via `ado_process_commit_message` (`src/index.ts`).

# Architecture Mapping (`ado-mcp-server`)

## System Role
- `ado-mcp-server` is a single-process MCP server that exposes Azure DevOps automation as MCP tools.
- Runtime entrypoint is `src/index.ts`, compiled to `dist/index.js`.
- Primary external dependency boundary is Azure DevOps REST APIs reached through `fetch` in `src/ado-api.ts`.

## Entry Points
- Process bootstrap starts in `src/index.ts`.
- MCP server is created via `new McpServer({ name, version })` in `src/index.ts`.
- Transport boundary is stdio (`StdioServerTransport`) in `src/index.ts`; this is a CLI-connected MCP server, not HTTP.
- Package executable mapping (`package.json` -> `bin.ado-mcp-server`) points to `dist/index.js`.

## Architectural Layers
- Tool Interface Layer: MCP tool registrations and zod input schemas in `src/index.ts`.
- Application Service Layer: methods on `AdoClient` in `src/ado-api.ts` (work item, comments, PR linking, commit automation).
- Integration/Infra Layer: generic request/retry/auth/url builders in `src/ado-api.ts` (`request`, `headers`, URL helpers).
- Configuration Layer: environment loading and validation in `src/config.ts`.

## Request and Data Flow
- Tool invocation enters a specific `server.tool(...)` handler in `src/index.ts`.
- Handler calls `createClient()` (`src/index.ts`), which consumes `loadAdoEnv()` and `isAdoEnvComplete()` from `src/config.ts`.
- If env is incomplete, handler returns a normalized error payload via `envErrorJson()`.
- If env is complete, handler delegates to `AdoClient` methods in `src/ado-api.ts`.
- `AdoClient.request()` builds auth headers (`Authorization: Basic <PAT>`) and executes `fetch` with retry/backoff for 429/502/503/504.
- Successful raw responses are transformed to typed DTO-style objects (`WorkItemDetails`, `WorkItemComment`, etc.).
- Tool layer wraps results with consistent JSON text output via `toolResult()` in `src/index.ts`.
- Errors are normalized at boundary via `errResult()` (`AdoApiError` status-aware + generic fallback).

## Module Boundaries
- `src/index.ts` owns protocol shape, schema validation, and response formatting.
- `src/ado-api.ts` owns all Azure DevOps protocol/endpoint specifics and transformation logic.
- `src/config.ts` owns environment contract only (`ADO_PAT`, `ADO_ORG`, `ADO_PROJECT`).
- `src/index.ts` does not directly build URLs or call `fetch`; it only uses `AdoClient`.
- `src/ado-api.ts` does not depend on MCP SDK types; this separation supports easier unit testing.

## State Management
- No persistent store exists.
- State is ephemeral per request, derived from:
- Process environment (`process.env`) through `src/config.ts`.
- Remote Azure DevOps entities fetched on demand.
- Idempotency strategy is functional and remote-state based:
- Comment duplication prevention uses normalized text compare in `AdoClient.addComment()`.
- PR linking avoids duplicate relations by reading existing work item relations before PATCH.

## Cross-Cutting Concerns
- Validation: zod schemas at tool boundary in `src/index.ts`.
- Error shaping: centralized result wrappers (`toolResult`, `errResult`) in `src/index.ts`.
- Retry resilience: bounded exponential backoff with jitter in `src/ado-api.ts`.
- Security: PAT only from env (`src/config.ts`), never hardcoded.
- Compatibility: API versions are constants in `src/ado-api.ts` (`WIT_API`, `COMMENTS_API`, etc.).

## Notable Patterns and Tradeoffs
- Pattern: thin transport/controller + richer service client.
- Pattern: DTO mapping to avoid leaking Azure response variability to tool consumers.
- Tradeoff: all tools share one `AdoClient` class, which is simple but can become a large god-object as features grow.
- Tradeoff: no structured logger and no metrics hooks; troubleshooting relies on surfaced API error text.

## Extension Guidance
- Add new MCP tools in `src/index.ts` with zod input schema and `toolResult`/`errResult` response wrapping.
- Add Azure DevOps operations in `src/ado-api.ts` as focused methods using existing `request()` helper.
- Add new required configuration in `src/config.ts` and consume it through `createClient()` flow.
- Preserve current layering: avoid adding raw `fetch` calls directly in `src/index.ts`.

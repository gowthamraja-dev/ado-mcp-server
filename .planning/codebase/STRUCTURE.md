# Structure Mapping

## Repository Layout
- `package.json`: package metadata, runtime scripts, Node engine constraint (`>=20`), and dependency manifest.
- `package-lock.json`: npm lockfile for reproducible dependency graph.
- `tsconfig.json`: TypeScript compiler configuration for building `src/` into `dist/`.
- `README.md`: high-level capability summary and environment requirements.
- `src/index.ts`: MCP server bootstrap and tool registration.
- `src/ado-api.ts`: Azure DevOps API client and domain methods.
- `src/config.ts`: environment configuration helpers.
- `.planning/codebase/ARCHITECTURE.md`: architecture-focused mapping document.
- `.planning/codebase/STRUCTURE.md`: structure-focused mapping document.

## Source Module Breakdown
- `src/index.ts` owns process startup and tool surface (`ado_ping`, `ado_get_work_item`, `ado_list_comments`, `ado_add_comment`, `ado_update_comment`, `ado_link_pr_to_work_item`, `ado_process_commit_message`).
- `src/ado-api.ts` owns transport-level behavior (HTTP requests, retries, auth headers), response shaping, and URL/ID normalization helpers.
- `src/config.ts` owns config loading (`loadAdoEnv`), config validation (`isAdoEnvComplete`), and consistent env error payload (`envErrorJson`).

## Logical Layering
- Entry Layer: `src/index.ts` (MCP protocol integration and schema validation).
- Service Layer: `src/ado-api.ts` (domain operations and Azure DevOps API integration).
- Config Layer: `src/config.ts` (environment boundary).

## Data and Control Paths
- Tool request arrives in `src/index.ts` and is validated with `zod` schemas.
- A client instance is created from environment (`loadAdoEnv` + `isAdoEnvComplete`).
- Business operation executes in `AdoClient` (`src/ado-api.ts`).
- Output is normalized to text JSON via `toolResult()` in `src/index.ts`.
- Errors pass through `errResult()`; typed API errors include HTTP status context.

## External Dependencies
- `@modelcontextprotocol/sdk`: MCP server and stdio transport types used in `src/index.ts`.
- `zod`: tool input schema definitions in `src/index.ts`.
- Runtime native APIs: `fetch`, `URL`, and `Buffer` used in `src/ado-api.ts` (Node >=20).

## Build and Execution Structure
- Development entry command is `npm run dev` -> `tsx src/index.ts`.
- Production build command is `npm run build` -> `tsc`.
- Production start command is `npm start` -> `node dist/index.js`.
- Bin mapping in `package.json` exposes CLI command `ado-mcp-server` pointing at `dist/index.js`.

## Notable Structural Characteristics
- Small codebase with three source files and clear responsibility split.
- No test directories or CI config files are present in current tracked file list.
- Planning artifacts are under `.planning/`, separated from runtime source under `src/`.

# Coding Conventions

## Scope and Current Maturity
- The implementation is concentrated in `src/index.ts`, `src/ado-api.ts`, and `src/config.ts`.
- This is a small, single-package Node + TypeScript service with ESM output (`"type": "module"` in `package.json`).
- Conventions are mostly implicit in code patterns rather than enforced by lint/format tooling.

## TypeScript and Style Baseline
- TypeScript is strict (`"strict": true` in `tsconfig.json`), so new code should avoid `any` and prefer explicit interfaces.
- Module system is NodeNext ESM (`"module": "NodeNext"`, `"moduleResolution": "NodeNext"` in `tsconfig.json`).
- Imports use explicit `.js` extensions for local modules in TS source (for example `import { AdoClient } from "./ado-api.js";` in `src/index.ts`).
- Favor `const` for immutable values and named helpers for repeated logic (see `jsonText`, `toolResult`, `errResult` in `src/index.ts`).
- Keep utility functions small and pure where possible (`normalizeCommentText`, `backoffMs`, `parseAzureDevOpsPrUrl` in `src/ado-api.ts`).

## Naming Conventions
- Types and interfaces use PascalCase: `AdoClient`, `AdoApiError`, `WorkItemDetails` in `src/ado-api.ts`.
- Functions and variables use camelCase: `createClient`, `loadAdoEnv`, `pickAssignedTo`.
- Constants use SCREAMING_SNAKE_CASE: `MAX_RETRIES`, `BASE_DELAY_MS`, `COMMENTS_API`.
- Tool names are snake_case strings exposed to MCP clients: `"ado_get_work_item"`, `"ado_process_commit_message"` in `src/index.ts`.
- Environment variable names are uppercase with `ADO_` prefix: `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` in `src/config.ts`.

## Module Organization Patterns
- `src/index.ts` acts as composition root:
- It initializes the server, validates environment readiness, registers tools, and maps errors to tool output.
- `src/ado-api.ts` is the API integration layer:
- It encapsulates HTTP requests, retry/backoff logic, URL construction, parsing, and domain mapping.
- `src/config.ts` isolates environment loading and readiness checks.
- Practical rule: keep MCP transport/tool registration in `src/index.ts`; move remote-API logic and parsing into `src/ado-api.ts`-style modules.

## Error Handling and Logging
- Domain-specific errors are wrapped in `AdoApiError` with `status` and optional `body` (`src/ado-api.ts`).
- Tool handlers never throw to caller; they return structured `{ ok: false, error, status? }` payloads through `errResult` in `src/index.ts`.
- Retry logic is centralized in `AdoClient.request` with exponential backoff and jitter for transient status codes 429/502/503/504.
- Input validation is defensive: invalid PR URLs return explicit non-throw responses in `linkPullRequestToWorkItem`.
- There is currently no centralized logging abstraction (no `console` logging pattern and no logger module).
- Recommendation: add minimal structured logging (request id, tool name, error class, status) without including PAT or sensitive headers.

## Configuration Patterns
- Configuration is runtime-only through environment variables (`loadAdoEnv` in `src/config.ts`).
- Missing config is handled as a user-facing structured error (`envErrorJson`) rather than process crash.
- `createClient` in `src/index.ts` gates all API operations on `isAdoEnvComplete`.
- Practical rule: keep config loading/validation pure and centralized; avoid reading `process.env` directly outside `src/config.ts`.

## API and Contract Patterns
- MCP tool inputs are validated with `zod` schemas at registration (`server.tool` blocks in `src/index.ts`).
- Tool outputs are consistently text-wrapped JSON via `toolResult` for protocol compatibility.
- Client API methods return typed domain objects rather than raw response blobs (`WorkItemDetails`, `WorkItemComment`).
- Idempotency is explicit for comment creation (`addComment` duplicate suppression via normalized text in `src/ado-api.ts`).
- Cross-system linking validates org/project alignment before write operations (`linkPullRequestToWorkItem`).

## Quality Recommendations (Conventions)
- Add lint and formatting scripts in `package.json` (for example `lint`, `format`, `typecheck`) to make conventions enforceable.
- Add a lightweight architecture note describing the `index/config/api` boundary so new files follow the same shape.
- Introduce a shared result type for tool responses to reduce accidental output drift across handlers.

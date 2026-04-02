# STACK

## Repository Scope
- This repo is a TypeScript Node.js MCP server focused on Azure DevOps automation.
- Primary entrypoint is `src/index.ts`, compiled output goes to `dist/` via `tsc`.
- CLI binary mapping is declared in `package.json` (`bin.ado-mcp-server -> dist/index.js`).

## Languages / Runtime
- Language: TypeScript (`src/index.ts`, `src/ado-api.ts`, `src/config.ts`).
- Runtime: Node.js 20+ enforced by `package.json` `engines.node`.
- Module system: ESM (`package.json` has `"type": "module"`).
- JS target: ES2022 (`tsconfig.json` `compilerOptions.target`).
- NodeNext module resolution (`tsconfig.json` `module` and `moduleResolution` are `NodeNext`).

## Frameworks / Libraries
- MCP framework: `@modelcontextprotocol/sdk`.
- Transport: stdio MCP transport via `StdioServerTransport` in `src/index.ts`.
- Validation/schema: `zod` used for tool input contracts in `src/index.ts`.
- Native web API usage: `fetch` and `URL` in `src/ado-api.ts` (no Axios/request layer).

## Build / Tooling
- Build command: `npm run build` -> `tsc` (`package.json` scripts).
- Dev command: `npm run dev` -> `tsx src/index.ts`.
- Start command: `npm run start` -> `node dist/index.js`.
- Type tooling: `typescript`, `tsx`, `@types/node` in `devDependencies`.
- Compiler emits declaration and source maps (`tsconfig.json`: `declaration`, `declarationMap`, `sourceMap`).
- Strict typing is enabled (`tsconfig.json` `strict: true`).

## Config / Environment
- Runtime configuration is environment-driven in `src/config.ts`.
- Required env vars: `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT`.
- Env validation helper: `isAdoEnvComplete()` in `src/config.ts`.
- Missing config behavior: tools return structured error from `envErrorJson()`.
- Credentials model: PAT only, never checked into code (documented in comments in `src/config.ts` and `src/index.ts`).

## Data / Storage
- No local database, ORM, cache, or filesystem persistence layer.
- State is effectively stateless per request; persistent data lives in Azure DevOps.
- Data contracts are plain TS interfaces in `src/ado-api.ts`:
- `WorkItemDetails`, `WorkItemComment`, `AddCommentResult`, `ParsedPrUrl`.
- Comment de-duplication is computed in-memory by normalized text comparison (`normalizeCommentText`).

## Deployment / Operations
- Process model: CLI/server process launched by host and connected over stdio (`src/index.ts`).
- Suitable for local MCP host execution or containerized process execution; no HTTP listener in this codebase.
- Reliability controls: retry/backoff with jitter in `src/ado-api.ts` (`MAX_RETRIES`, `backoffMs`, `shouldRetryStatus`).
- Error model: custom `AdoApiError` carrying status/body, converted to MCP-safe JSON responses.
- Versioning:
- Server version is hardcoded in `src/index.ts` as `0.2.0`.
- Package version is `0.2.0` in `package.json`.

## Not Present / Explicit Gaps
- No test suite or test runner configs found in repository root.
- No lint/format config (e.g., ESLint/Prettier) found in tracked files.
- No CI/CD workflow files in the visible repository snapshot.
- No secrets manager integration; env injection must be handled by runtime environment.

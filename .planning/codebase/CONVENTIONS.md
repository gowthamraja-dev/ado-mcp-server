# Code Conventions

## Scope
This document reflects the current conventions in `src/index.ts`, `src/ado-api.ts`, `src/config.ts`, `package.json`, and `tsconfig.json`.

## Language and Runtime
- The project is TypeScript-first with ESM enabled via `"type": "module"` in `package.json`.
- Build output goes to `dist/` from `src/` as configured in `tsconfig.json` (`"outDir": "dist"`, `"rootDir": "src"`).
- Module mode uses NodeNext (`"module": "NodeNext"`, `"moduleResolution": "NodeNext"`) in `tsconfig.json`.
- Node baseline is explicit in `package.json` as `"node": ">=20"`.

## Strictness and Type Discipline
- Compiler strict mode is enabled (`"strict": true` in `tsconfig.json`), so nullability and implicit any checks are expected.
- Public shapes are declared with interfaces in `src/ado-api.ts` (`WorkItemDetails`, `WorkItemComment`, `AddCommentResult`, `ParsedPrUrl`, `ParsedGithubPrUrl`).
- Unknown input is normalized through narrow helper functions in `src/ado-api.ts` (`pickString`, `pickDescription`, `pickAssignedTo`).

## Import and Module Conventions
- Internal imports include `.js` extensions even inside `.ts` sources, e.g. `import { AdoClient } from "./ado-api.js"` in `src/index.ts`.
- Type-only imports are used where appropriate, e.g. `import type { AdoEnvConfig } from "./config.js"` in `src/ado-api.ts`.
- Third-party libraries are focused and minimal: MCP SDK and Zod in `package.json`.

## API and Error-Handling Conventions
- External API faults are wrapped with a typed domain error `AdoApiError` in `src/ado-api.ts`.
- Retry behavior is centralized in `AdoClient.request()` in `src/ado-api.ts` with exponential backoff and jitter (`MAX_RETRIES`, `backoffMs`, `shouldRetryStatus`).
- Tool handlers in `src/index.ts` follow a stable pattern: create client, gate on env completeness, `try/catch`, return structured JSON.
- Response formatting is normalized via `jsonText()`, `toolResult()`, and `errResult()` in `src/index.ts`.

## Input Validation and Tool Contract Conventions
- MCP tool schemas are validated with Zod in `src/index.ts` (`z.number().int().positive()`, `z.string().url()`, optional flags).
- Defaults are explicit in handlers, e.g. comments pagination defaults to `200` in `src/index.ts`.
- Idempotent behavior is a recurring convention for mutation paths (`addComment()` duplicate suppression and relation de-dup checks in `src/ado-api.ts`).

## Security and Configuration Conventions
- Credentials are environment-driven only via `loadAdoEnv()` in `src/config.ts`.
- Missing env state is surfaced as structured JSON through `envErrorJson()` in `src/config.ts`.
- URL and identity matching logic for PR linking is explicitly guarded in `linkPullRequestToWorkItem()` in `src/ado-api.ts`.

## Documentation and Naming Conventions
- Top-level functions and tool blocks frequently include concise JSDoc comments in `src/index.ts` and `src/ado-api.ts`.
- Naming is descriptive and action-oriented (`getWorkItemDetails`, `listComments`, `processCommitMessage`, `parseAzureDevOpsPrUrl`).
- Constants are uppercase snake case (`WIT_API`, `COMMENTS_API`, `MAX_RETRIES`, `BASE_DELAY_MS`) in `src/ado-api.ts`.

# Repository Structure Mapping (`ado-mcp-server`)

## Top-Level Layout
- `src/`: authoritative TypeScript source.
- `dist/`: compiled JavaScript and declaration outputs from `tsc`.
- `.planning/`: planning artifacts; codebase mapping docs live in `.planning/codebase/`.
- `package.json`: package metadata, scripts, runtime entrypoint, dependency graph.
- `tsconfig.json`: compiler boundaries (`rootDir: src`, `outDir: dist`).
- `README.md`: minimal project descriptor (currently sparse).

## Source Module Inventory (`src/`)
- `src/index.ts`: MCP server bootstrap and all tool registrations.
- `src/ado-api.ts`: Azure DevOps API client, URL parsing/building, retry policy, and domain transforms.
- `src/config.ts`: env config model and validation helpers.

## Build and Runtime Structure
- Dev run path: `npm run dev` -> `tsx src/index.ts` (`package.json`).
- Build path: `npm run build` -> `tsc` into `dist/` (`package.json`, `tsconfig.json`).
- Production start path: `npm run start` -> `node dist/index.js`.
- Module system is ESM/NodeNext (`package.json` `"type": "module"`, `tsconfig.json` NodeNext).

## Naming and File Patterns
- File naming uses lowercase kebab-ish/short names (`ado-api.ts`, `config.ts`, `index.ts`).
- Exported types/interfaces are PascalCase (`WorkItemDetails`, `AdoEnvConfig`).
- Internal helpers are lowerCamelCase (`projectRootUrl`, `normalizeGuid`).
- API version constants are uppercase snake-like constants in `src/ado-api.ts`.

## Practical Feature Placement
- New MCP tool definitions: add to `src/index.ts` near related tool group.
- New Azure endpoint integrations: add method(s) to `src/ado-api.ts`.
- Shared parsing/normalization utilities for ADO data: keep in `src/ado-api.ts` unless reused outside ADO concerns.
- New environment flags or secrets contract: extend `src/config.ts`.
- Avoid putting business logic in tool handlers; keep handlers as orchestration.

## Test Placement Recommendations
- No test directory exists yet.
- Add tests under `tests/` at repo root or `src/__tests__/` depending on runner choice.
- Suggested split:
- `tests/unit/ado-api.test.ts` for URL parsing, retries (with mocked fetch), mapping helpers.
- `tests/unit/config.test.ts` for env completeness/error cases.
- `tests/integration/tools.test.ts` for tool-layer behavior and error/result shaping.
- Keep fixture payloads in `tests/fixtures/` for Azure API response samples.

## Documentation Placement Recommendations
- Expand `README.md` with setup (`ADO_PAT`, `ADO_ORG`, `ADO_PROJECT`) and tool catalog.
- Keep architecture and structure references in `.planning/codebase/`.
- Add operation examples in `docs/` if command/tool usage grows (e.g., `docs/tool-examples.md`).

## Dependency Structure
- Runtime deps (`package.json`): `@modelcontextprotocol/sdk`, `zod`.
- Dev deps: `typescript`, `tsx`, `@types/node`.
- External platform coupling is isolated to Azure DevOps REST in `src/ado-api.ts`.

## Change Hotspots
- Highest-change file likely `src/index.ts` when adding/removing tools.
- Second hotspot `src/ado-api.ts` for new endpoints and workflow automation.
- Lower churn expected in `src/config.ts`.

## Structural Risks and Scaling Notes
- Single `AdoClient` file can grow quickly; consider future split by concern (`work-items`, `comments`, `git-links`).
- Lack of dedicated `types/` folder is fine now, but may become useful as DTO count increases.
- `dist/` is build output and should remain generated-only (no manual edits).

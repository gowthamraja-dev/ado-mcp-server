# State

## Current

- **Version**: 0.2.0 (see `package.json`).
- **Entry**: `src/index.ts` → build output `dist/index.js`.
- **Implementation**: `src/config.ts`, `src/ado-api.ts`.

## Last known good

- `npm install` and `npm run build` succeed on Node 20+.

## Configuration reminder

Set `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` in the MCP server process environment before starting the server.

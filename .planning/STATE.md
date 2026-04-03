# State

## Current

- **Version**: 0.2.0 (see `package.json`).
- **Entry**: `src/index.ts` → build output `dist/index.js`.
- **Implementation**: `src/config.ts`, `src/ado-api.ts`.

## Last known good

- `npm install` and `npm run build` succeed on Node 20+.

## Configuration reminder

Set `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` in the MCP server process environment before starting the server.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Create a skill for UI-focused PR review: infer task ID from branch, load task description/comments/acceptance criteria/discussions, and review only relevant UI or service scope against PR changes. | 2026-04-03 | 2206a56 | [1-create-a-skill-for-ui-focused-pr-review-](./quick/1-create-a-skill-for-ui-focused-pr-review-/) |
| 2 | Improve get-work-item skill and data shape so it fetches definition-of-done, reason for change, discussions, descriptions, and other necessary task context. | 2026-04-03 | b25af2d | [2-improve-get-work-item-skill-and-data-sha](./quick/2-improve-get-work-item-skill-and-data-sha/) |

Last activity: 2026-04-03 - Completed quick task 2: Improve get-work-item skill and data shape so it fetches definition-of-done, reason for change, discussions, descriptions, and other necessary task context.

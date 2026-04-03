# Quick Task 2 Summary

## Task
Improve get-work-item skill and data shape so it fetches definition-of-done, reason for change, discussions, descriptions, and other necessary task context.

## What was implemented
- Expanded `ado_get_work_item` response model in `src/ado-api.ts` with richer fields:
  - `workItemType`, `acceptanceCriteria`, `definitionOfDone`, `reason`, `history`
  - `tags`, `areaPath`, `iterationPath`, `changedDate`, `changedBy`
  - optional `discussions` block containing comments.
- Added optional tool inputs in `src/server.ts`:
  - `includeDiscussion` (default `true`)
  - `discussionTop` (default `50`, max `500`)
- Updated skill/docs:
  - `skills/ado-get-work-item/SKILL.md`
  - `skills/ado-mcp-overview/SKILL.md`
  - `README.md`

## Validation
- `npm run build` passes.

## Implementation commit
- `b25af2d` `feat(work-items): expand ado_get_work_item review context`

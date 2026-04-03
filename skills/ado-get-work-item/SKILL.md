---
name: ado-get-work-item
description: Calls MCP tool ado_get_work_item to load Azure DevOps work item details with rich review context (description, acceptance criteria, definition of done, reason, state, assignee, and optional discussions/comments).
---

# ado_get_work_item

## MCP tool

`ado_get_work_item`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workItemId` | positive integer | Azure DevOps work item id |
| `includeDiscussion` | optional boolean | Include discussion comments in response (default `true`) |
| `discussionTop` | optional integer (1-500) | Max comments included when discussion is enabled (default `50`) |

## Response

On success: `ok: true` and `workItem` with:
- `id`
- `workItemType`
- `title`
- `description`
- `acceptanceCriteria`
- `definitionOfDone`
- `reason`
- `history`
- `state`
- `tags`
- `areaPath`
- `iterationPath`
- `changedDate`
- `changedBy`
- `assignedTo` (display name)
- `discussions` (optional): `{ count, comments[] }`

## When to use

- User gives a work item number and needs full review/planning context in one call.
- Validate id exists before linking PRs or posting comments.
- Pull acceptance criteria + DoD + reason + discussion context before PR review.

---
name: ado-get-work-item
description: Calls MCP tool ado_get_work_item to load Azure DevOps work item details (title, description, state, assignedTo). Use when reading or summarizing a work item by numeric id.
---

# ado_get_work_item

## MCP tool

`ado_get_work_item`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workItemId` | positive integer | Azure DevOps work item id |

## Response

On success: `ok: true` and `workItem` with `id`, `title`, `description`, `state`, `assignedTo` (display name).

## When to use

- User gives a work item number and needs fields for planning or comments.
- Validate id exists before linking PRs or posting comments.

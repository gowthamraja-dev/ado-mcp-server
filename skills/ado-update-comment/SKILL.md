---
name: ado-update-comment
description: Calls MCP tool ado_update_comment to PATCH an existing Azure DevOps work item comment by commentId. Use when editing comment text after listing comments or adding a comment.
---

# ado_update_comment

## MCP tool

`ado_update_comment`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workItemId` | positive integer | Work item id |
| `commentId` | positive integer | From `ado_list_comments` or `ado_add_comment` response |
| `text` | non-empty string | Replacement comment body |

## Response

`ok`, `workItemId`, `comment` (updated record).

## When to use

- Fix typos or refresh an automated comment in place.
- Requires a valid `commentId` from list/add responses.

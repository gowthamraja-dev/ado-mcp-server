---
name: ado-list-comments
description: Calls MCP tool ado_list_comments to list non-deleted comments on an Azure DevOps work item (id, text, timestamps). Use when reviewing thread history or finding commentId for updates.
---

# ado_list_comments

## MCP tool

`ado_list_comments`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workItemId` | positive integer | Work item id |
| `top` | optional positive integer, max 500 | Max comments (default 200) |

## Response

`ok`, `workItemId`, `count`, `comments` array.

## When to use

- Read discussion before adding a comment.
- Obtain `commentId` for `ado_update_comment`.

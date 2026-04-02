---
name: ado-add-comment
description: Calls MCP tool ado_add_comment to post a comment on an Azure DevOps work item with optional duplicate suppression. Use when commenting on a work item from the agent or automations.
---

# ado_add_comment

## MCP tool

`ado_add_comment`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workItemId` | positive integer | Work item id |
| `text` | non-empty string | Comment body |
| `skipIfDuplicate` | optional boolean | If true (default), skip when normalized text already exists |

## Response

`ok`, `workItemId`, plus result fields from the API (e.g. new comment id when posted).

## When to use

- Post updates, decisions, or links on a work item.
- Idempotent automation: keep `skipIfDuplicate` true unless a duplicate post is required.

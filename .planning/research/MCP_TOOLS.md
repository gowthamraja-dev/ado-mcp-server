# MCP Tools

All tools return **one text content part** with **pretty-printed JSON**.

## ado_ping

- **Purpose**: Process health; reports whether required env vars are set (no Azure call).
- **Input**: none.

## ado_get_work_item

- **Purpose**: Work item details.
- **Input**: `workItemId` (positive integer).
- **Output**: `workItem`: `{ id, title, description, state, assignedTo }`.

## ado_list_comments

- **Purpose**: List non-deleted comments.
- **Input**: `workItemId`, optional `top` (default 200, max 500).

## ado_add_comment

- **Purpose**: Add a comment.
- **Input**: `workItemId`, `text`, optional `skipIfDuplicate` (default true).

## ado_update_comment

- **Purpose**: Update comment text.
- **Input**: `workItemId`, `commentId`, `text`.

## ado_link_pr_to_work_item

- **Purpose**: Add PR relation via JSON Patch.
- **Input**: `workItemId`, `prUrl` (HTTPS dev.azure.com PR URL; org/project must match env).

## ado_process_commit_message

- **Purpose**: Find `#id` in message, post idempotent commit comment, optionally link PR.
- **Input**: `commitMessage`, optional `prUrl`.

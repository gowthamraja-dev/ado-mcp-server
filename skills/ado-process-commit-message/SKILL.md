---
name: ado-process-commit-message
description: Calls MCP tool ado_process_commit_message to resolve work item id from #123 in commit text or from branchName pattern, post idempotent Updated via commit comment, and optionally link a PR. Use for commit hooks, release notes, or agent-driven commit workflows.
---

# ado_process_commit_message

## MCP tool

`ado_process_commit_message`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `commitMessage` | non-empty string | Full message; may include `#workItemId` |
| `prUrl` | optional HTTPS URL | ADO or GitHub PR to link after commenting |
| `branchName` | optional string | Current branch if message has no `#id`; pattern like `feature/foo_CR3195_Title` → id `3195` |

## Behavior

- Parses `#<id>` from the message, or infers id from `branchName` when documented patterns apply.
- Adds idempotent comment: `Updated via commit: <message>`.
- If `prUrl` is set, links that PR to the resolved work item.

## Response

Structured JSON describing resolution, comment, and link outcome (see server implementation for exact shape).

## When to use

- Post-commit or CI step to sync Azure Boards with git activity.
- Agent workflows that have commit message + optional PR URL and branch name.

# Requirements

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ADO_PAT` | Azure DevOps Personal Access Token |
| `ADO_ORG` | Organization name (URL segment on dev.azure.com) |
| `ADO_PROJECT` | Project name (URL segment) |

## Authentication

- Read PAT from **`ADO_PAT` only** (no hardcoded credentials).
- HTTP Basic: **username empty**, **password = PAT** (encoded as `base64(":" + PAT)`).

## Features (implemented)

### A. Work Item APIs

- Get work item by id.
- Exposed fields: **title**, **description**, **state**, **assignedTo** (display name).

### B. Comments

- List comments for a work item.
- Add comment.
- Update comment by **commentId**.

### C. Pull Request Linking

- Link a PR to a work item via **PATCH** work item **relations** (ArtifactLink / `vstfs:///Git/PullRequestId/...`).
- Input: full **PR URL** on dev.azure.com.

### D. Commit-based Automation

- Parse commit message for pattern **`#<work_item_id>`** (first match).
- If found:
  - Add comment: `Updated via commit: <commit_message>` (idempotent against duplicate normalized text).
  - Optionally link PR when **PR URL** is provided.

## Non-functional

- **Retry**: Exponential backoff with jitter for 429, 502, 503, 504 and network failures.
- **Idempotency**: Duplicate comment detection by normalized text when enabled on add.
- **MCP**: Tools return structured JSON in the text content for clients.

## MCP Tools

See `.planning/research/MCP_TOOLS.md` for the tool catalog and parameters.

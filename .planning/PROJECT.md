# ado-mcp-server

## What This Is

A **Model Context Protocol (stdio)** server that exposes Azure DevOps work item operations to MCP clients (for example Codex). It supports reading work items, managing comments, linking pull requests to work items, and commit-message automation that references work items with `#123`.

## Core Value

Agents and developers can **fetch work item details**, **comment on tasks**, **link PRs to work items**, and **drive automation from commit messages** without embedding secrets in code or prompts.

## Constraints

- **Authentication**: Personal Access Token (PAT) only via environment variable `ADO_PAT`. Basic auth uses empty username and PAT as password. Never hardcode credentials.
- **Scope**: Configured organization and project via `ADO_ORG` and `ADO_PROJECT`.
- **PR URLs**: Must be `https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}` and org/project must match the configured env.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Stdio MCP transport | Standard for local agent integration. |
| JSON tool responses | Single text payload with pretty-printed JSON for clean client parsing. |
| Retries with backoff | Resilience to Azure rate limits and transient errors. |
| Idempotent comment add | Optional duplicate suppression by normalized comment text. |

---
*Planning artifacts for this repo live under `.planning/`.*

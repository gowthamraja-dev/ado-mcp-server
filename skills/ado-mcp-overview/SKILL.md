---
name: ado-mcp-overview
description: Azure DevOps MCP (ado-mcp-server) tool index. Use when working with Azure DevOps work items, comments, PR links, or commit automation via MCP; points to per-tool skills and required env (ADO_PAT, ADO_ORG, ADO_PROJECT).
---

# Azure DevOps MCP — tool index

All tools return **JSON** in a single text content part. Configure **ADO_PAT**, **ADO_ORG**, **ADO_PROJECT** in the environment (never commit secrets).

| MCP tool | Skill folder | Use for |
|----------|----------------|---------|
| `ado_ping` | [ado-ping](../ado-ping/SKILL.md) | Health check, env configured? |
| `ado_get_work_item` | [ado-get-work-item](../ado-get-work-item/SKILL.md) | Fetch rich task context: description, acceptance criteria, DoD, reason, state, assignee, optional discussions |
| `ado_list_comments` | [ado-list-comments](../ado-list-comments/SKILL.md) | List comments on a work item |
| `ado_add_comment` | [ado-add-comment](../ado-add-comment/SKILL.md) | Post a comment (optional duplicate skip) |
| `ado_update_comment` | [ado-update-comment](../ado-update-comment/SKILL.md) | Edit comment by id |
| `ado_link_pr_to_work_item` | [ado-link-pr-to-work-item](../ado-link-pr-to-work-item/SKILL.md) | Link ADO or GitHub PR to work item |
| `ado_process_commit_message` | [ado-process-commit-message](../ado-process-commit-message/SKILL.md) | `#id` / branch parsing, commit comment, optional PR link |

**Workflow tip:** Use `ado_ping` first if env might be wrong; use `ado_get_work_item` before commenting when you need context.

---
name: ado-link-pr-to-work-item
description: Calls MCP tool ado_link_pr_to_work_item to attach a pull request to an Azure DevOps work item (ArtifactLink for dev.azure.com PRs, Hyperlink for github.com). Use when associating a PR with a work item after merge or for traceability.
---

# ado_link_pr_to_work_item

## MCP tool

`ado_link_pr_to_work_item`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workItemId` | positive integer | Work item to link |
| `prUrl` | HTTPS URL | Pull request on `dev.azure.com` or `github.com` |

## Constraints

- Azure DevOps PR URLs must match **ADO_ORG** and **ADO_PROJECT** from the server environment.

## Response

`ok`, `workItemId`, plus link details from the API.

## When to use

- After opening a PR, link it to the tracked work item.
- Close the loop from commits/issues to code review.

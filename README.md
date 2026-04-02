# ado-mcp-server

MCP server for Azure DevOps work items and automation.

## What It Supports

- Work item read/update-comment flows in Azure DevOps.
- Commit message automation (`#123` work item extraction).
- PR linking to work items:
  - Azure DevOps PR URLs (`dev.azure.com/.../_git/.../pullrequest/{id}`) are added as `ArtifactLink`.
  - GitHub PR URLs (`github.com/{owner}/{repo}/pull/{id}`) are added as `Hyperlink`.

## Environment

Set Azure DevOps credentials (for work item APIs):

- `ADO_PAT`
- `ADO_ORG`
- `ADO_PROJECT`

## Run

```bash
npm run build
npm start
```

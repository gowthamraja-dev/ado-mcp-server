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

## Agent skills (Cursor & Codex)

Packaged skills live under **`skills/`** (one folder per MCP tool plus `ado-mcp-overview`). **On `npm install`**, **`postinstall`** runs `scripts/install-skills.mjs --default`, which copies skills to **both** `~/.cursor/skills` and `~/.codex/skills` (unless skipped in CI). See **`scripts/README.md`** for where scripts live and what they do.

**Interactive install** (choose Cursor, Codex, or both — global or `--local` project paths):

```bash
ado-mcp-install-skills
# or
ado-mcp-server install-skills
```

**Non-interactive examples:**

```bash
ado-mcp-install-skills --target=codex
ado-mcp-install-skills --target=cursor --local
ado-mcp-install-skills --target=both
ado-mcp-install-skills --help
```

**Skip automatic postinstall** (CI or opt-out): set `ADO_MCP_SKIP_INSTALL_SKILLS=1`, or rely on the default skip when `CI=true`. To run anyway: `ado-mcp-install-skills --force --default`.

**npm script** (interactive unless you pass flags):

```bash
npm run install-skills
```

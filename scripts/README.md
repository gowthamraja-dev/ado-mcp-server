# `scripts/`

| File | Role |
|------|------|
| **`install-skills.mjs`** | Installs packaged skills from `../skills/` into **Cursor** (`~/.cursor/skills`) and/or **Codex** (`~/.codex/skills`), or into the current repo with `--local`. Invoked by **`npm postinstall`** (`--default`, both global targets), by the **`ado-mcp-install-skills`** CLI, and by **`ado-mcp-server install-skills`** (same flags). |

Source skills live in the repository root: **`../skills/`** (not in this folder).

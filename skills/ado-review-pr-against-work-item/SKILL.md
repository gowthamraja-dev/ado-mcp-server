---
name: ado-review-pr-against-work-item
description: Review a PR against Azure DevOps task context by resolving work item id from branch/title, pulling description+criteria+discussions, and checking only relevant scope (UI-first by default) with explicit fallback and confidence reporting.
---

# PR Review Against Work Item (UI-first)

## Purpose

Use this skill when reviewing a PR and verifying changes against linked task context:
- task description
- acceptance criteria / definition of done in the task text
- clarifications from discussion comments

Default review emphasis is UI. If the PR is backend-only, review only the related service scope.

## Inputs

| Input | Required | Notes |
|------|----------|-------|
| `prUrl` | yes | GitHub or Azure DevOps PR URL |
| `repo` | optional | `owner/repo` when URL is not provided |
| `prNumber` | optional | Use with `repo` |
| `reviewFocus` | optional | `ui` (default), `backend`, or `auto` |
| `workItemId` | optional | Explicit override when branch/title parsing fails |

## Required tools

- `ado_ping`
- `ado_process_commit_message`
- `ado_get_work_item`
- `ado_list_comments`
- PR metadata/diff source (`gh pr view`, `gh pr diff`, or local git equivalent)

Tool call note:
- `ado_*` are MCP tools, not shell commands. Do not run `ado_ping` in bash.
- If MCP tools are unavailable, continue with PR-only review and mark verdict as provisional.

## Workflow

1. Load PR context
- Get PR title, description/body, head branch, base branch, changed files, and diff.
- If only `repo` + `prNumber` are provided, build/fetch the PR URL first.

2. Resolve work item id
- Call `ado_process_commit_message` using:
  - `commitMessage`: PR title (or title + first line of body)
  - `branchName`: PR head branch
  - `prUrl`: PR URL when available
- If no id is resolved:
  - use provided `workItemId` when available
  - otherwise stop and request explicit id

3. Pull task context from Azure DevOps
- Run `ado_ping`; if `envConfigured=false`, switch to PR-only mode.
- Call `ado_get_work_item(workItemId, includeDiscussion=true)`.
- If needed, call `ado_list_comments(workItemId)` for additional comment coverage.
- Extract:
  - acceptance criteria statements
  - definition of done/checklist items
  - clarifications/decisions from comments
  - reason for change and state metadata

4. Determine review scope
- If `reviewFocus=ui`, limit to UI layers and UI-impacting contracts.
- If `reviewFocus=backend`, limit to touched backend service(s).
- If `reviewFocus=auto`, infer dominant scope from changed files.

Scope heuristics:
- UI files: `ui/`, `web/`, `frontend/`, `src/components/`, `src/pages/`, `src/views/`, `*.css`, `*.scss`, `*.tsx`, `*.jsx`.
- Backend files: `services/<name>/`, `api/`, `backend/`, `src/controllers/`, `src/routes/`, `src/db/`, `*.ts`, `*.js` (non-UI paths).
- For backend PRs touching multiple services, review only services that changed in this PR.

5. Build criterion map
- Normalize criteria from:
  - `acceptanceCriteria`
  - `definitionOfDone`
  - relevant comment decisions
- Create one trace row per criterion with `status`, `evidence`, and `gaps`.

6. Evaluate implementation against task intent
- Map every criterion to concrete diff evidence (path + line/section reference).
- For UI-focused reviews, explicitly verify:
  - states (loading, empty, error, success)
  - validation and edge cases
  - responsiveness and accessibility basics
- Mark each criterion as: `met`, `partially_met`, `not_met`, or `not_in_scope`.

7. Produce review output
- Findings first, ordered by severity.
- Include file references for every issue.
- Separate `Out of scope` and `Missing evidence`.
- Include `confidence` and whether the verdict is `final` or `provisional`.

## Output template

```markdown
## Scope
- PR: <url>
- Work item: <id>
- Focus: <ui/backend/auto result>
- Files reviewed: <count and key paths>

## Data Availability
- Azure MCP tools: <available/unavailable>
- Work item fields loaded: <yes/no>
- Discussion/comments loaded: <yes/no>
- Mode: <full-context/pr-only fallback>

## Criteria Coverage
1. <criterion> — <met/partially_met/not_met/not_in_scope> — <evidence> — <gap if any>

## Findings (Highest severity first)
1. [severity] <title> — <path:line> — <why it matters> — <suggested fix>

## Out of Scope
1. <changed area intentionally excluded and why>

## Missing Evidence
1. <what could not be verified from available data>

## Open Questions
1. <question>

## Verdict
- Ready: <yes/no>
- Blocking items: <count>
- Confidence: <high/medium/low>
- Verdict type: <final/provisional>
```

## Review rules

- Do not demand backend changes for a UI-only ticket unless the UI behavior requires a missing API contract.
- Do not score untouched services.
- Prefer concrete diff evidence over assumptions.
- If Azure task context is unavailable, never claim full criterion compliance; mark verdict as provisional.

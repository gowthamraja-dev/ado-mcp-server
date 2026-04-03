---
name: ado-review-pr-against-work-item
description: Review a PR against Azure DevOps task context by resolving work item id from branch/title, reading task description plus comments, and checking only relevant scope (UI-first by default, or related backend microservice when requested).
---

# PR Review Against Work Item (UI-first)

## Purpose

Use this skill when you are reviewing a PR and must verify that changes satisfy the linked task context:
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

## Required tools

- `ado_ping`
- `ado_process_commit_message`
- `ado_get_work_item`
- `ado_list_comments`
- PR metadata/diff source (`gh pr view`, `gh pr diff`, or local git equivalent)

## Workflow

1. Load PR context.
- Get PR title, description/body, head branch, base branch, changed files, and diff.
- If only `repo` + `prNumber` are provided, build/fetch the PR URL first.

2. Resolve work item id.
- Call `ado_process_commit_message` using:
  - `commitMessage`: PR title (or title + first line of body)
  - `branchName`: PR head branch
  - `prUrl`: PR URL when available
- If no id is resolved, stop and ask for explicit work item id.

3. Pull task context from Azure DevOps.
- Call `ado_get_work_item(workItemId)`.
- Call `ado_list_comments(workItemId)`.
- Extract:
  - acceptance criteria statements
  - definition of done/checklist items
  - clarifications/decisions from comments

4. Determine review scope.
- If `reviewFocus=ui`, limit to UI layers and UI-impacting contracts.
- If `reviewFocus=backend`, limit to touched backend service(s).
- If `reviewFocus=auto`, infer dominant scope from changed files.

Scope heuristics:
- UI files: `ui/`, `web/`, `frontend/`, `src/components/`, `src/pages/`, `src/views/`, `*.css`, `*.scss`, `*.tsx`, `*.jsx`.
- Backend files: `services/<name>/`, `api/`, `backend/`, `src/controllers/`, `src/routes/`, `src/db/`, `*.ts`, `*.js` (non-UI paths).
- For backend PRs touching multiple services, review only services that changed in this PR.

5. Evaluate implementation against task intent.
- Map each acceptance criterion to concrete code/diff evidence.
- Verify user-visible behavior for UI work:
  - states (loading, empty, error, success)
  - validation and edge cases
  - responsiveness and accessibility basics
- Mark each criterion as: `met`, `partially met`, `not met`, or `not in scope`.

6. Produce review output.
- Findings first, ordered by severity.
- Include file references for every issue.
- Separate:
  - `Out of scope` (changed but unrelated areas)
  - `Missing evidence` (criterion cannot be verified from PR)

## Output template

```markdown
## Scope
- PR: <url>
- Work item: <id>
- Focus: <ui/backend/auto result>
- Files reviewed: <count and key paths>

## Criteria Coverage
1. <criterion> — <met/partially met/not met/not in scope> — <evidence>

## Findings (Highest severity first)
1. [severity] <title> — <path:line> — <why it matters> — <suggested fix>

## Open Questions
1. <question>

## Verdict
- Ready: <yes/no>
- Blocking items: <count>
```

## Review rules

- Do not demand backend changes for a UI-only ticket unless the UI behavior requires a missing API contract.
- Do not score untouched services.
- Prefer concrete diff evidence over assumptions.

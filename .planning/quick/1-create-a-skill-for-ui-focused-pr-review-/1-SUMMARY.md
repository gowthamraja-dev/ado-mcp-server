# Quick Task 1 Summary

## Task
Create a skill for UI-focused PR review: infer task ID from branch, load task description/comments/acceptance criteria/discussions, and review only relevant UI or service scope against PR changes.

## What was implemented
- Added new skill: `skills/ado-review-pr-against-work-item/SKILL.md`.
- Documented the capability in `README.md` under supported features.

## Skill behavior highlights
- Resolves work item id from PR title/body + branch via `ado_process_commit_message`.
- Pulls task details and discussions via `ado_get_work_item` and `ado_list_comments`.
- Applies scope filtering:
  - UI-first by default.
  - Backend mode reviews only touched related service(s).
- Produces a structured review output with criteria coverage and severity-ordered findings.

## Implementation commit
- `2206a56` `feat(skills): add UI-focused PR review skill`

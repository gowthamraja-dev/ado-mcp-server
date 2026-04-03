---
quick_task: 1
title: Create a skill for UI-focused PR review against task context
status: in_progress
---

# Quick Task 1 Plan

## Goal
Create a reusable skill that reviews a PR against Azure DevOps task context (description, acceptance criteria, DoD, and discussion comments), resolving task id from branch when possible, and emphasizing UI-only scope when requested.

## Task 1
- files: `skills/ado-review-pr-against-work-item/SKILL.md`
- action: Add a new skill definition with a concrete workflow for PR intake, task-id resolution, work-item context retrieval, scope filtering (UI/backend microservice), and review output format.
- verify: Skill file exists, has valid frontmatter, and provides deterministic steps an agent can execute.
- done: New skill can be installed by existing installer and used without additional repo changes.

## Task 2
- files: `README.md`
- action: Add the new skill to the documented supported capabilities.
- verify: README mentions the PR review skill and its focus.
- done: Users can discover the new skill from top-level docs.

## Task 3
- files: `.planning/quick/1-create-a-skill-for-ui-focused-pr-review-/1-SUMMARY.md`
- action: Capture implementation summary and commit reference.
- verify: Summary includes what changed and why.
- done: Quick-task artifact is complete for state tracking.

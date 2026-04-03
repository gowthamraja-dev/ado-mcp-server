---
quick_task: 2
title: Expand ado_get_work_item context fields for richer PR/task reviews
status: in_progress
---

# Quick Task 2 Plan

## Goal
Improve get-work-item skill + tool data so reviewers can fetch definition-of-done, reason for change, discussion context, descriptions, and other key task metadata in one call.

## Task 1
- files: `src/ado-api.ts`, `src/server.ts`
- action: Extend work-item details model and `ado_get_work_item` tool to return richer context fields and optional discussion comments.
- verify: TypeScript build succeeds and tool contract remains backward-compatible.
- done: `ado_get_work_item` returns expanded context needed for review workflows.

## Task 2
- files: `skills/ado-get-work-item/SKILL.md`, `skills/ado-mcp-overview/SKILL.md`, `README.md`
- action: Update skill docs to reflect new parameters/response and usage guidance for definition/reason/discussion data.
- verify: Docs align with server implementation and field names.
- done: Users can discover and correctly use enhanced get-work-item behavior.

## Task 3
- files: `.planning/quick/2-improve-get-work-item-skill-and-data-sha/2-SUMMARY.md`, `.planning/STATE.md`
- action: Record quick task summary and state tracking row.
- verify: Summary exists and state table reflects quick task #2.
- done: Quick workflow artifacts complete and commit-ready.

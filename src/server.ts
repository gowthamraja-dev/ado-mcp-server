/**
 * Azure DevOps MCP server — tools for work items, comments, PR linking, and commit automation.
 * Configure ADO_PAT, ADO_ORG, ADO_PROJECT in the environment (never hardcode credentials).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AdoApiError, AdoClient } from "./ado-api.js";
import {
  envErrorJson,
  isAdoEnvComplete,
  loadAdoEnv,
} from "./config.js";

const server = new McpServer({
  name: "ado-mcp-server",
  version: "0.2.0",
});

function jsonText(data: unknown) {
  return JSON.stringify(data, null, 2);
}

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: jsonText(data) }] };
}

function errResult(e: unknown) {
  if (e instanceof AdoApiError) {
    return toolResult({
      ok: false,
      error: e.message,
      status: e.status,
    });
  }
  const msg = e instanceof Error ? e.message : String(e);
  return toolResult({ ok: false, error: msg });
}

function createClient(): AdoClient | null {
  const cfg = loadAdoEnv();
  if (!isAdoEnvComplete(cfg)) return null;
  return new AdoClient(cfg);
}

/**
 * Health check — does not call Azure DevOps.
 */
server.tool(
  "ado_ping",
  "Returns whether the MCP server process is running (no Azure DevOps call).",
  {},
  async () =>
    toolResult({
      ok: true,
      server: "ado-mcp-server",
      envConfigured: isAdoEnvComplete(loadAdoEnv()),
    })
);

/**
 * Fetch work item fields used in planning: title, description, state, assignedTo.
 */
server.tool(
  "ado_get_work_item",
  "Get work item details by numeric id. Returns title, description, state, and assignedTo (display name).",
  { workItemId: z.number().int().positive().describe("Azure DevOps work item id") },
  async ({ workItemId }) => {
    const client = createClient();
    if (!client) return toolResult(envErrorJson());
    try {
      const workItem = await client.getWorkItemDetails(workItemId);
      return toolResult({ ok: true, workItem });
    } catch (e) {
      return errResult(e);
    }
  }
);

/**
 * List comments on a work item (non-deleted).
 */
server.tool(
  "ado_list_comments",
  "List comments for a work item. Each entry includes id, text, and timestamps when available.",
  {
    workItemId: z.number().int().positive().describe("Work item id"),
    top: z
      .number()
      .int()
      .positive()
      .max(500)
      .optional()
      .describe("Max comments to return (default 200)"),
  },
  async ({ workItemId, top }) => {
    const client = createClient();
    if (!client) return toolResult(envErrorJson());
    try {
      const comments = await client.listComments(workItemId, top ?? 200);
      return toolResult({ ok: true, workItemId, count: comments.length, comments });
    } catch (e) {
      return errResult(e);
    }
  }
);

/**
 * Add a comment with optional duplicate suppression (normalized text match).
 */
server.tool(
  "ado_add_comment",
  "Add a comment to a work item. Set skipIfDuplicate true (default) to avoid posting the same normalized text twice.",
  {
    workItemId: z.number().int().positive().describe("Work item id"),
    text: z.string().min(1).describe("Comment body"),
    skipIfDuplicate: z
      .boolean()
      .optional()
      .describe("If true, skip when an identical normalized comment exists (default true)"),
  },
  async ({ workItemId, text, skipIfDuplicate }) => {
    const client = createClient();
    if (!client) return toolResult(envErrorJson());
    try {
      const result = await client.addComment(
        workItemId,
        text,
        skipIfDuplicate !== false
      );
      return toolResult({ ok: true, workItemId, ...result });
    } catch (e) {
      return errResult(e);
    }
  }
);

/**
 * Update an existing comment by id.
 */
server.tool(
  "ado_update_comment",
  "Update a work item comment by commentId (PATCH comments API).",
  {
    workItemId: z.number().int().positive().describe("Work item id"),
    commentId: z.number().int().positive().describe("Comment id from list or add response"),
    text: z.string().min(1).describe("New comment text"),
  },
  async ({ workItemId, commentId, text }) => {
    const client = createClient();
    if (!client) return toolResult(envErrorJson());
    try {
      const comment = await client.updateComment(workItemId, commentId, text);
      return toolResult({ ok: true, workItemId, comment });
    } catch (e) {
      return errResult(e);
    }
  }
);

/**
 * Link a PR to a work item via ArtifactLink (PATCH /relations). PR URL must match ADO_ORG / ADO_PROJECT.
 */
server.tool(
  "ado_link_pr_to_work_item",
  "Link a pull request to a work item using PATCH relations. Supports Azure DevOps PR URLs and GitHub PR URLs. Azure DevOps links are added as ArtifactLink; GitHub links are added as Hyperlink.",
  {
    workItemId: z.number().int().positive().describe("Work item to link"),
    prUrl: z
      .string()
      .url()
      .describe("HTTPS PR URL on dev.azure.com or github.com"),
  },
  async ({ workItemId, prUrl }) => {
    const client = createClient();
    if (!client) return toolResult(envErrorJson());
    try {
      const link = await client.linkPullRequestToWorkItem(workItemId, prUrl);
      return toolResult({ ok: true, workItemId, ...link });
    } catch (e) {
      return errResult(e);
    }
  }
);

/**
 * Commit automation: find #&lt;id&gt; in message or infer id from branch, add idempotent comment, optionally link PR.
 */
server.tool(
  "ado_process_commit_message",
  "Automation: resolve work item id from #123 in the commit message, or from branchName (e.g. feature/12345-fix) when #id is omitted. Adds comment 'Updated via commit: <message>' (idempotent). If prUrl is provided, links that pull request (Azure DevOps or GitHub) to the work item.",
  {
    commitMessage: z
      .string()
      .min(1)
      .describe("Full commit message (may contain #workItemId)"),
    prUrl: z
      .string()
      .url()
      .optional()
      .describe("Optional Azure DevOps or GitHub PR URL to link after commenting"),
    branchName: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Current git branch; used when the message has no #123. Expected shape: {type}/{name}_{taskType}{id}_{title} (e.g. feature/gowtham_CR3195_BasicPlanActivation → id 3195)."
      ),
  },
  async ({ commitMessage, prUrl, branchName }) => {
    const client = createClient();
    if (!client) return toolResult(envErrorJson());
    try {
      const result = await client.processCommitMessage(commitMessage, prUrl, branchName);
      return toolResult(result);
    } catch (e) {
      return errResult(e);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

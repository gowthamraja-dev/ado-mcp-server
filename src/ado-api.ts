import type { AdoEnvConfig } from "./config.js";

const WIT_API = "7.1";
const COMMENTS_API = "7.1-preview.3";
const GIT_API = "7.1";
const PROJECTS_API = "7.1";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(): number {
  return Math.random() * 250;
}

function backoffMs(attempt: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempt + jitter(), 30_000);
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function projectRootUrl(org: string, project: string): string {
  return `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}`;
}

function orgRootUrl(org: string): string {
  return `https://dev.azure.com/${encodeURIComponent(org)}`;
}

function basicAuthHeader(pat: string): string {
  const token = Buffer.from(`:${pat}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function normalizeCommentText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export interface WorkItemDetails {
  id: number;
  title: string | null;
  description: string | null;
  state: string | null;
  assignedTo: string | null;
}

export interface WorkItemComment {
  id: number;
  text: string;
  createdDate?: string;
  modifiedDate?: string;
  isDeleted?: boolean;
}

export interface AddCommentResult {
  comment: WorkItemComment;
  idempotent: boolean;
  skippedReason?: string;
}

export interface ParsedPrUrl {
  org: string;
  project: string;
  repo: string;
  pullRequestId: number;
}

export class AdoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string
  ) {
    super(message);
    this.name = "AdoApiError";
  }
}

export class AdoClient {
  constructor(private readonly cfg: AdoEnvConfig) {}

  private headers(body?: unknown, contentType?: string): HeadersInit {
    const h: Record<string, string> = {
      Authorization: basicAuthHeader(this.cfg.pat),
      Accept: "application/json",
    };
    if (body !== undefined) {
      h["Content-Type"] = contentType ?? "application/json";
    }
    return h;
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options?: { contentType?: string }
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const hasBody =
        body !== undefined && method !== "GET" && method !== "HEAD";
      const init: RequestInit = {
        method,
        headers: this.headers(
          hasBody ? body : undefined,
          hasBody ? options?.contentType : undefined
        ),
      };
      if (hasBody) {
        init.body = JSON.stringify(body);
      }
      try {
        const res = await fetch(url, init);
        const text = await res.text();
        if (res.ok) {
          if (!text) return undefined as T;
          try {
            return JSON.parse(text) as T;
          } catch {
            return text as unknown as T;
          }
        }
        if (shouldRetryStatus(res.status) && attempt < MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new AdoApiError(
          `Azure DevOps API error ${res.status}: ${text.slice(0, 500)}`,
          res.status,
          text
        );
      } catch (e) {
        if (e instanceof AdoApiError) throw e;
        lastErr = e;
        if (attempt < MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw e;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(String(lastErr));
  }

  private witUrl(path: string, query: Record<string, string> = {}): string {
    const base = projectRootUrl(this.cfg.org, this.cfg.project);
    const q = new URLSearchParams({ "api-version": WIT_API, ...query });
    return `${base}/_apis/wit/${path}?${q}`;
  }

  private commentsUrl(
    workItemId: number,
    suffix = "",
    query: Record<string, string> = {}
  ): string {
    const base = projectRootUrl(this.cfg.org, this.cfg.project);
    const q = new URLSearchParams({
      "api-version": COMMENTS_API,
      ...query,
    });
    return `${base}/_apis/wit/workItems/${workItemId}/comments${suffix}?${q}`;
  }

  async getWorkItemDetails(workItemId: number): Promise<WorkItemDetails> {
    const url = this.witUrl(`workitems/${workItemId}`);
    const data = await this.request<{
      id: number;
      fields?: Record<string, unknown>;
    }>("GET", url);
    const f = data.fields ?? {};
    return {
      id: data.id,
      title: pickString(f["System.Title"]),
      description: pickDescription(f["System.Description"]),
      state: pickString(f["System.State"]),
      assignedTo: pickAssignedTo(f["System.AssignedTo"]),
    };
  }

  async listComments(
    workItemId: number,
    top = 200
  ): Promise<WorkItemComment[]> {
    const url = this.commentsUrl(workItemId, "", { $top: String(top) });
    const data = await this.request<{
      comments?: Array<{
        id: number;
        text: string;
        createdDate?: string;
        modifiedDate?: string;
        isDeleted?: boolean;
      }>;
    }>("GET", url);
    const list = data.comments ?? [];
    return list
      .filter((c) => !c.isDeleted)
      .map((c) => ({
        id: c.id,
        text: c.text,
        createdDate: c.createdDate,
        modifiedDate: c.modifiedDate,
        isDeleted: c.isDeleted,
      }));
  }

  /**
   * Idempotent add: when skipIfDuplicate is true, skips if the same normalized text exists.
   */
  async addComment(
    workItemId: number,
    text: string,
    skipIfDuplicate: boolean
  ): Promise<AddCommentResult> {
    const normalized = normalizeCommentText(text);
    if (skipIfDuplicate) {
      const existing = await this.listComments(workItemId);
      const dup = existing.find(
        (c) => normalizeCommentText(c.text) === normalized
      );
      if (dup) {
        return {
          comment: dup,
          idempotent: true,
          skippedReason: "duplicate_comment",
        };
      }
    }
    const url = this.commentsUrl(workItemId, "");
    const created = await this.request<{
      id: number;
      text: string;
      createdDate?: string;
    }>("POST", url, { text });
    return {
      comment: {
        id: created.id,
        text: created.text,
        createdDate: created.createdDate,
      },
      idempotent: false,
    };
  }

  async updateComment(
    workItemId: number,
    commentId: number,
    text: string
  ): Promise<WorkItemComment> {
    const url = this.commentsUrl(workItemId, `/${commentId}`);
    const updated = await this.request<{
      id: number;
      text: string;
      modifiedDate?: string;
    }>("PATCH", url, { text });
    return {
      id: updated.id,
      text: updated.text,
      modifiedDate: updated.modifiedDate,
    };
  }

  async getWorkItemRaw(workItemId: number): Promise<{
    id: number;
    relations?: Array<{ rel: string; url: string; attributes?: unknown }>;
  }> {
    const url = this.witUrl(`workitems/${workItemId}`, {
      $expand: "relations",
    });
    return this.request("GET", url);
  }

  /**
   * Link a pull request to a work item using JSON Patch on relations (ArtifactLink).
   * PR URL format: https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}
   */
  async linkPullRequestToWorkItem(
    workItemId: number,
    prUrlInput: string
  ): Promise<{ linked: boolean; artifactUrl: string; message: string }> {
    const parsed = parseAzureDevOpsPrUrl(prUrlInput.trim());
    if (!parsed) {
      return {
        linked: false,
        artifactUrl: "",
        message:
          "Invalid PR URL. Expected: https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}",
      };
    }
    if (
      parsed.org.toLowerCase() !== this.cfg.org.toLowerCase() ||
      parsed.project.toLowerCase() !== this.cfg.project.toLowerCase()
    ) {
      return {
        linked: false,
        artifactUrl: "",
        message: `PR URL org/project must match ADO_ORG and ADO_PROJECT (got ${parsed.org}/${parsed.project}, expected ${this.cfg.org}/${this.cfg.project}).`,
      };
    }

    const projectGuid = await this.getProjectId(parsed.org, parsed.project);
    const repoGuid = await this.getRepositoryId(
      parsed.org,
      parsed.project,
      parsed.repo
    );
    const artifactUrl = buildPullRequestArtifactUrl(
      projectGuid,
      repoGuid,
      parsed.pullRequestId
    );

    const existing = await this.getWorkItemRaw(workItemId);
    const rels = existing.relations ?? [];
    const want = vstfsComparable(artifactUrl);
    if (rels.some((r) => r.url && vstfsComparable(r.url) === want)) {
      return {
        linked: false,
        artifactUrl,
        message: "Relation already present; no change.",
      };
    }

    const patchUrl = this.witUrl(`workitems/${workItemId}`);
    await this.request(
      "PATCH",
      patchUrl,
      [
        {
          op: "add",
          path: "/relations/-",
          value: {
            rel: "ArtifactLink",
            url: artifactUrl,
            attributes: {
              name: "Pull Request",
            },
          },
        },
      ],
      { contentType: "application/json-patch+json" }
    );

    return {
      linked: true,
      artifactUrl,
      message: "Pull request linked to work item.",
    };
  }

  /**
   * Parses commit message for #&lt;id&gt;, adds idempotent comment, optionally links PR.
   */
  async processCommitMessage(
    commitMessage: string,
    prUrl?: string
  ): Promise<Record<string, unknown>> {
    const match = /#(\d+)/.exec(commitMessage);
    if (!match) {
      return {
        ok: true,
        matched: false,
        reason: "No work item reference (#123) found in commit message.",
      };
    }
    const workItemId = Number.parseInt(match[1]!, 10);
    if (Number.isNaN(workItemId)) {
      return { ok: false, matched: false, reason: "Invalid work item id." };
    }

    const commentText = `Updated via commit: ${commitMessage}`;
    const add = await this.addComment(workItemId, commentText, true);

    const result: Record<string, unknown> = {
      ok: true,
      matched: true,
      workItemId,
      comment: {
        id: add.comment.id,
        text: add.comment.text,
        idempotent: add.idempotent,
        skippedReason: add.skippedReason,
      },
    };

    if (prUrl?.trim()) {
      const link = await this.linkPullRequestToWorkItem(workItemId, prUrl.trim());
      result.prLink = link;
    }

    return result;
  }

  private async getProjectId(org: string, project: string): Promise<string> {
    const url = `${orgRootUrl(org)}/_apis/projects/${encodeURIComponent(project)}?api-version=${PROJECTS_API}`;
    const data = await this.request<{ id: string }>("GET", url);
    return normalizeGuid(data.id);
  }

  private async getRepositoryId(
    org: string,
    project: string,
    repoName: string
  ): Promise<string> {
    const base = projectRootUrl(org, project);
    const url = `${base}/_apis/git/repositories/${encodeURIComponent(repoName)}?api-version=${GIT_API}`;
    const data = await this.request<{ id: string }>("GET", url);
    return normalizeGuid(data.id);
  }
}

function vstfsComparable(url: string): string {
  try {
    return decodeURIComponent(url.trim()).toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeGuid(id: string): string {
  return id.replace(/[{}]/g, "").toLowerCase();
}

function buildPullRequestArtifactUrl(
  projectId: string,
  repositoryId: string,
  pullRequestId: number
): string {
  return `vstfs:///Git/PullRequestId/${projectId}%2F${repositoryId}%2F${pullRequestId}`;
}

export function parseAzureDevOpsPrUrl(raw: string): ParsedPrUrl | null {
  try {
    const u = new URL(raw.split("?")[0]!);
    if (u.hostname !== "dev.azure.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // org, project, _git, repo, pullrequest, id
    const gi = parts.indexOf("_git");
    const pi = parts.indexOf("pullrequest");
    if (gi < 0 || pi < 0 || pi <= gi + 2) return null;
    const org = parts[0]!;
    const project = parts[1]!;
    const repo = parts[gi + 1]!;
    const prId = Number.parseInt(parts[pi + 1]!, 10);
    if (Number.isNaN(prId)) return null;
    return { org, project, repo, pullRequestId: prId };
  } catch {
    return null;
  }
}

function pickString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return null;
}

function pickDescription(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return null;
}

function pickAssignedTo(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null) {
    const o = v as { displayName?: string; uniqueName?: string };
    if (o.displayName) return o.displayName;
    if (o.uniqueName) return o.uniqueName;
  }
  return null;
}

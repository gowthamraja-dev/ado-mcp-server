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

export interface ParsedGithubPrUrl {
  owner: string;
  repo: string;
  pullRequestId: number;
}

/**
 * Infer Azure DevOps work item id from a git branch name.
 *
 * Primary format: `{type}/{name}_{taskType}{id}_{title}` — e.g.
 * `feature/gowtham_CR3195_BasicPlanActivation` → id **3195** (letters+digits before `_title`).
 *
 * Also supports `#123` in the branch and generic fallbacks (numeric segments, etc.).
 */
export function extractWorkItemIdFromBranch(branch: string): number | null {
  const b = branch.trim();
  if (!b) return null;

  const tryParse = (s: string): number | null => {
    const n = Number.parseInt(s, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  };

  const hash = /#(\d+)/.exec(b);
  if (hash) {
    const id = tryParse(hash[1]!);
    if (id !== null) return id;
  }

  /** `{name}_{taskType}{id}_{title}` on one path segment (task type = letters, id = digits). */
  const typedSegment = (segment: string): number | null => {
    const m = /^([^_]+)_([A-Za-z]+)(\d+)_(.+)$/.exec(segment.trim());
    if (!m) return null;
    return tryParse(m[3]!);
  };

  const segments = new Set<string>();
  segments.add(b);
  if (b.includes("/")) {
    segments.add(b.slice(b.indexOf("/") + 1));
    segments.add(b.slice(b.lastIndexOf("/") + 1));
  }
  for (const seg of segments) {
    const id = typedSegment(seg);
    if (id !== null) return id;
  }

  const prefix =
    /(?:^|[/])(?:wi|task|bug|feature|item|workitem|work)[-/]?(\d+)/i.exec(b);
  if (prefix) {
    const id = tryParse(prefix[1]!);
    if (id !== null) return id;
  }

  const afterSlash = /\/(\d{4,})(?:\/|-|_|$)/.exec(b);
  if (afterSlash) {
    const id = tryParse(afterSlash[1]!);
    if (id !== null) return id;
  }

  const leading = /^(\d{4,})(?:[-/]|$)/.exec(b);
  if (leading) {
    const id = tryParse(leading[1]!);
    if (id !== null) return id;
  }

  const fivePlus = /(\d{5,})/.exec(b);
  if (fivePlus) {
    const id = tryParse(fivePlus[1]!);
    if (id !== null) return id;
  }

  return null;
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
   * Link a pull request to a work item.
   * - Azure DevOps PR URLs are linked as ArtifactLink.
   * - GitHub PR URLs are linked as Hyperlink.
   */
  async linkPullRequestToWorkItem(
    workItemId: number,
    prUrlInput: string
  ): Promise<{ linked: boolean; artifactUrl: string; message: string }> {
    const prUrl = prUrlInput.trim();
    const adoParsed = parseAzureDevOpsPrUrl(prUrl);
    if (adoParsed) {
      if (
        adoParsed.org.toLowerCase() !== this.cfg.org.toLowerCase() ||
        adoParsed.project.toLowerCase() !== this.cfg.project.toLowerCase()
      ) {
        return {
          linked: false,
          artifactUrl: "",
          message: `PR URL org/project must match ADO_ORG and ADO_PROJECT (got ${adoParsed.org}/${adoParsed.project}, expected ${this.cfg.org}/${this.cfg.project}).`,
        };
      }

      const projectGuid = await this.getProjectId(adoParsed.org, adoParsed.project);
      const repoGuid = await this.getRepositoryId(
        adoParsed.org,
        adoParsed.project,
        adoParsed.repo
      );
      const artifactUrl = buildPullRequestArtifactUrl(
        projectGuid,
        repoGuid,
        adoParsed.pullRequestId
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

      await this.addWorkItemRelation(workItemId, {
        rel: "ArtifactLink",
        url: artifactUrl,
        attributes: {
          name: "Pull Request",
        },
      });

      return {
        linked: true,
        artifactUrl,
        message: "Pull request linked to work item.",
      };
    }

    const githubParsed = parseGithubPrUrl(prUrl);
    if (githubParsed) {
      const existing = await this.getWorkItemRaw(workItemId);
      const rels = existing.relations ?? [];
      const want = urlComparable(prUrl);
      if (rels.some((r) => r.url && urlComparable(r.url) === want)) {
        return {
          linked: false,
          artifactUrl: prUrl,
          message: "GitHub PR link already present; no change.",
        };
      }

      await this.addWorkItemRelation(workItemId, {
        rel: "Hyperlink",
        url: prUrl,
        attributes: {
          name: "GitHub Pull Request",
          comment: `github.com/${githubParsed.owner}/${githubParsed.repo}#${githubParsed.pullRequestId}`,
        },
      });

      return {
        linked: true,
        artifactUrl: prUrl,
        message: "GitHub pull request linked to work item as Hyperlink.",
      };
    }

    return {
      linked: false,
      artifactUrl: "",
      message:
        "Invalid PR URL. Expected Azure DevOps URL (dev.azure.com/.../_git/.../pullrequest/{id}) or GitHub URL (github.com/{owner}/{repo}/pull/{id}).",
    };
  }

  /**
   * Parses commit message for #&lt;id&gt;, or infers id from branch name, adds idempotent comment, optionally links PR.
   */
  async processCommitMessage(
    commitMessage: string,
    prUrl?: string,
    branchName?: string
  ): Promise<Record<string, unknown>> {
    let workItemId: number | null = null;
    let workItemSource: "commit_message" | "branch" | undefined;

    const hashMatch = /#(\d+)/.exec(commitMessage);
    if (hashMatch) {
      workItemId = Number.parseInt(hashMatch[1]!, 10);
      if (!Number.isNaN(workItemId) && workItemId > 0) {
        workItemSource = "commit_message";
      } else {
        workItemId = null;
      }
    }

    if (workItemId === null && branchName?.trim()) {
      const fromBranch = extractWorkItemIdFromBranch(branchName.trim());
      if (fromBranch !== null) {
        workItemId = fromBranch;
        workItemSource = "branch";
      }
    }

    if (workItemId === null) {
      return {
        ok: true,
        matched: false,
        reason:
          "No work item id: add #123 to the commit message, or pass branchName like feature/gowtham_CR3195_BasicPlanActivation ({type}/{name}_{taskType}{id}_{title}).",
      };
    }

    const commentText = `Updated via commit: ${commitMessage}`;
    const add = await this.addComment(workItemId, commentText, true);

    const result: Record<string, unknown> = {
      ok: true,
      matched: true,
      workItemId,
      workItemSource,
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

  private async addWorkItemRelation(
    workItemId: number,
    relation: {
      rel: "ArtifactLink" | "Hyperlink";
      url: string;
      attributes?: Record<string, unknown>;
    }
  ): Promise<void> {
    const patchUrl = this.witUrl(`workitems/${workItemId}`);
    await this.request(
      "PATCH",
      patchUrl,
      [
        {
          op: "add",
          path: "/relations/-",
          value: relation,
        },
      ],
      { contentType: "application/json-patch+json" }
    );
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

function urlComparable(url: string): string {
  try {
    const u = new URL(url.trim());
    let path = u.pathname;
    if (path.length > 1) path = path.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
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
    if (gi < 0 || pi < 0 || pi !== gi + 2 || pi + 1 >= parts.length) return null;
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

export function parseGithubPrUrl(raw: string): ParsedGithubPrUrl | null {
  try {
    const u = new URL(raw.split("?")[0]!);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // owner, repo, pull, id
    if (parts.length < 4 || parts[2] !== "pull") return null;
    const owner = parts[0]!;
    const repo = parts[1]!;
    const prId = Number.parseInt(parts[3]!, 10);
    if (Number.isNaN(prId)) return null;
    return { owner, repo, pullRequestId: prId };
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

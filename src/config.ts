/**
 * Loads Azure DevOps configuration from the process environment.
 * Credentials are never embedded in code; PAT must be supplied via ADO_PAT.
 */
export interface AdoEnvConfig {
  pat: string;
  org: string;
  project: string;
}

export function loadAdoEnv(): AdoEnvConfig {
  return {
    pat: process.env.ADO_PAT ?? "",
    org: process.env.ADO_ORG ?? "",
    project: process.env.ADO_PROJECT ?? "",
  };
}

export function isAdoEnvComplete(cfg: AdoEnvConfig): boolean {
  return Boolean(cfg.pat && cfg.org && cfg.project);
}

export function envErrorJson(): object {
  return {
    ok: false,
    error:
      "Missing required environment variables. Set ADO_PAT, ADO_ORG, and ADO_PROJECT.",
  };
}

#!/usr/bin/env node
/**
 * Entry: `install-skills` delegates to scripts/install-skills.mjs without loading MCP.
 * Otherwise starts the Azure DevOps MCP server (see server.ts).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
if (argv[0] === "install-skills") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const script = path.join(here, "..", "scripts", "install-skills.mjs");
  const r = spawnSync(process.execPath, [script, ...argv.slice(1)], {
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

await import("./server.js");

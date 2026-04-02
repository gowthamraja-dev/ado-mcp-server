#!/usr/bin/env node
/**
 * Installs packaged agent skills (see ../skills/) into Cursor and/or Codex skill dirs,
 * or into the current project (--local). npm postinstall uses --default (both, global).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, "..");
const skillsRoot = path.join(packageRoot, "skills");

/** @typedef {'cursor' | 'codex'} SkillKind */

function parseArgs(argv) {
  const opts = {
    local: false,
    dryRun: false,
    defaultMode: false,
    /** @type {SkillKind | 'both' | null} */
    target: null,
    help: false,
  };
  for (const a of argv) {
    if (a === "--local") opts.local = true;
    if (a === "--dry-run") opts.dryRun = true;
    if (a === "--default") opts.defaultMode = true;
    if (a === "--help" || a === "-h") opts.help = true;
    if (a.startsWith("--target=")) {
      const v = a.slice("--target=".length);
      if (v === "cursor" || v === "codex" || v === "both") opts.target = v;
    }
  }
  return opts;
}

function shouldSkip(argv) {
  if (argv.includes("--force")) return false;
  if (process.env.ADO_MCP_SKIP_INSTALL_SKILLS === "1" || process.env.ADO_MCP_SKIP_INSTALL_SKILLS === "true")
    return true;
  if (process.env.CI === "true" || process.env.CI === "1") return true;
  return false;
}

function listSkillDirs() {
  if (!fs.existsSync(skillsRoot)) return [];
  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  return entries.filter(
    (d) =>
      d.isDirectory() && fs.existsSync(path.join(skillsRoot, d.name, "SKILL.md"))
  );
}

/**
 * @param {SkillKind} kind
 * @param {{ local: boolean }} opts
 */
function skillsBaseFor(kind, opts) {
  if (opts.local) {
    if (kind === "cursor") return path.join(process.cwd(), ".cursor", "skills");
    return path.join(process.cwd(), ".codex", "skills");
  }
  if (kind === "cursor") return path.join(os.homedir(), ".cursor", "skills");
  return path.join(os.homedir(), ".codex", "skills");
}

/**
 * @param {string} targetBase
 * @param {import('node:fs').Dirent[]} skillDirs
 * @param {boolean} dryRun
 */
function copySkillsTo(targetBase, skillDirs, dryRun) {
  for (const d of skillDirs) {
    const src = path.join(skillsRoot, d.name);
    const dest = path.join(targetBase, d.name);
    if (dryRun) {
      console.log(`[dry-run] ${src} -> ${dest}`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}

/**
 * @param {SkillKind[]} kinds
 * @param {import('node:fs').Dirent[]} skillDirs
 * @param {{ dryRun: boolean, local: boolean }} opts
 */
function installKinds(kinds, skillDirs, opts) {
  for (const kind of kinds) {
    const base = skillsBaseFor(kind, opts);
    copySkillsTo(base, skillDirs, opts.dryRun);
    if (!opts.dryRun) {
      console.log(`ado-mcp-server: installed ${skillDirs.length} skill(s) -> ${base}`);
    }
  }
}

function printHelp() {
  console.log(`ado-mcp-install-skills — copy skills/ into Cursor and/or Codex skill directories.

Usage:
  ado-mcp-install-skills [options]

Options:
  --default          Non-interactive: install to ~/.cursor/skills and ~/.codex/skills (npm postinstall)
  --target=cursor    Only Cursor (global or --local)
  --target=codex     Only Codex (global or --local)
  --target=both      Both destinations
  --local            Use the current project (.cursor/skills and/or .codex/skills) instead of home
  --dry-run          Print copy paths only
  --force            Run even when CI=1 or ADO_MCP_SKIP_INSTALL_SKILLS=1
  -h, --help         This message

Environment:
  ADO_MCP_SKIP_INSTALL_SKILLS=1   Skip postinstall / default installs
  CI=1                            Skip postinstall / default installs

Scripts: ${path.join(packageRoot, "scripts")}
Skills:  ${skillsRoot}
`);
}

/**
 * @param {boolean} local
 * @returns {Promise<SkillKind[]>}
 */
async function promptKinds(local) {
  const c = local
    ? path.join(process.cwd(), ".cursor", "skills")
    : path.join(os.homedir(), ".cursor", "skills");
  const x = local
    ? path.join(process.cwd(), ".codex", "skills")
    : path.join(os.homedir(), ".codex", "skills");
  const scope = local ? "this project" : "your home directory";
  console.log(`
Where should ado-mcp-server skills be installed (${scope})?

  1) Cursor  (${c})
  2) Codex   (${x})
  3) Both
  4) Cancel
`);
  const rl = readline.createInterface({ input, output });
  const ans = await rl.question("Enter 1–4 [default: 3]: ");
  rl.close();
  const n = (ans.trim() || "3")[0] ?? "3";
  if (n === "1") return ["cursor"];
  if (n === "2") return ["codex"];
  if (n === "3") return ["cursor", "codex"];
  if (n === "4") return [];
  return ["cursor", "codex"];
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  if (opts.help) {
    printHelp();
    return;
  }

  if (shouldSkip(argv) && !opts.defaultMode) {
    return;
  }

  const fromPostinstall = process.env.npm_lifecycle_event === "postinstall";

  if (shouldSkip(argv) && opts.defaultMode) {
    return;
  }

  const skillDirs = listSkillDirs();
  if (skillDirs.length === 0) {
    console.warn("ado-mcp-server: skills directory missing or empty; skip install-skills");
    return;
  }

  /** @type {SkillKind[]} */
  let kinds = [];

  if (opts.defaultMode) {
    kinds = ["cursor", "codex"];
  } else if (opts.target === "both") {
    kinds = ["cursor", "codex"];
  } else if (opts.target === "cursor" || opts.target === "codex") {
    kinds = [opts.target];
  } else if (input.isTTY && !fromPostinstall) {
    kinds = await promptKinds(opts.local);
  } else {
    kinds = ["cursor", "codex"];
  }

  if (kinds.length === 0) {
    console.log("ado-mcp-server: cancelled.");
    return;
  }

  const runOpts = { dryRun: opts.dryRun, local: opts.local };

  try {
    installKinds(kinds, skillDirs, runOpts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`ado-mcp-server: skills install failed: ${msg}`);
    if (!fromPostinstall) {
      process.exitCode = 1;
    }
  }
}

main();

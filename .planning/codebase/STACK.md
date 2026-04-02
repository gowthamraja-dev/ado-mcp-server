# Technology Stack Mapping (`ado-mcp-server`)

## Runtime + Language
- Runtime target is Node.js `>=20` (`package.json` `engines.node`).
- Source language is TypeScript with ESM module mode (`package.json` `type: "module"`).
- Entry point at runtime is `dist/index.js` (`package.json` `main`, `bin.ado-mcp-server`).
- CLI-style executable shebang is in `src/index.ts` (`#!/usr/bin/env node`).

## Build + Dev Tooling
- Build compiler is `typescript` (`package.json` `scripts.build`, `devDependencies.typescript`).
- Development runner is `tsx` (`package.json` `scripts.dev`, `devDependencies.tsx`).
- Production run command is `node dist/index.js` (`package.json` `scripts.start`).
- No lint/test scripts are defined in `package.json` currently.

## TypeScript Configuration
- Compiler config is in `tsconfig.json`.
- Output directory is `dist` (`tsconfig.json` `compilerOptions.outDir`).
- Input/source directory is `src` (`tsconfig.json` `compilerOptions.rootDir`).
- Module system is `NodeNext` (`tsconfig.json` `module`, `moduleResolution`).
- Target is `ES2022` (`tsconfig.json` `target`).
- Type safety is strict (`tsconfig.json` `strict: true`).
- Type declaration artifacts are generated (`tsconfig.json` `declaration`, `declarationMap`).
- Source maps are enabled (`tsconfig.json` `sourceMap`).

## Core Libraries
- MCP framework: `@modelcontextprotocol/sdk` (`package.json` `dependencies`).
- Schema/input validation: `zod` (`package.json` `dependencies`).
- Node typings: `@types/node` (`package.json` `devDependencies`).
- No ORM, no database client, no web framework dependency present.

## Application Architecture
- Server assembly and tool registration lives in `src/index.ts`.
- Azure DevOps HTTP integration and domain logic is encapsulated in `src/ado-api.ts`.
- Environment loading/validation is isolated in `src/config.ts`.
- Transport model is stdio MCP (`src/index.ts` imports `StdioServerTransport`).

## Exposed MCP Tool Surface
- Health check tool: `ado_ping` (`src/index.ts`).
- Work item read tool: `ado_get_work_item` (`src/index.ts`).
- Comments list/add/update tools: `ado_list_comments`, `ado_add_comment`, `ado_update_comment` (`src/index.ts`).
- PR linking tool: `ado_link_pr_to_work_item` (`src/index.ts`).
- Commit automation tool: `ado_process_commit_message` (`src/index.ts`).

## Packaging and Distribution Notes
- Package is private (`package.json` `private: true`) and versioned `0.2.0`.
- Built output folder `dist/` is present in repository root.
- Lockfile is npm (`package-lock.json`), so package manager baseline is npm.

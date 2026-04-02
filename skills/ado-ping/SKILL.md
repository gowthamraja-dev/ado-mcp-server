---
name: ado-ping
description: Calls MCP tool ado_ping to verify ado-mcp-server is running and whether ADO_PAT, ADO_ORG, ADO_PROJECT are set (no Azure API call). Use before other ADO MCP tools when troubleshooting or checking configuration.
---

# ado_ping

## MCP tool

`ado_ping`

## When to use

- Confirm the MCP server process responds.
- Check `envConfigured` without calling Azure DevOps.

## Parameters

None.

## Response

JSON with `ok`, `server`, `envConfigured`.

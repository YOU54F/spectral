import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

type MaybeMcpServer = Record<string, unknown>;

// e.g. https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
const mcpServerSchemaRegex =
  /^https?:\/\/static\.modelcontextprotocol\.io\/schemas\/[A-Za-z0-9_~.-]+\/server\.schema\.json$/;

// reverse-DNS namespace + "/" + server name, e.g. io.github.user/weather
const mcpServerNameRegex = /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/;

const isMcpServer = (document: unknown): document is MaybeMcpServer => {
  if (!isPlainObject(document)) return false;

  const { $schema, name, version, packages, remotes } = document as MaybeMcpServer;

  if (typeof $schema === 'string') {
    return mcpServerSchemaRegex.test($schema);
  }

  // Fallback heuristic for server.json documents without "$schema".
  return (
    typeof name === 'string' &&
    mcpServerNameRegex.test(name) &&
    typeof version === 'string' &&
    (Array.isArray(packages) || Array.isArray(remotes))
  );
};

export const mcpServer: Format = isMcpServer;
mcpServer.displayName = 'MCP Server (server.json)';

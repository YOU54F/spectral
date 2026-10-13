import { createRulesetFunction } from '@stoplight/spectral-core';

export const CURRENT_SCHEMA_URL = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpSchemaVersion(server, _opts, { path: basePath }) {
    const { $schema } = server;

    if ($schema === void 0) {
      return [
        {
          message: `"$schema" must be set to "${CURRENT_SCHEMA_URL}"; the MCP registry requires it.`,
        },
      ];
    }

    if ($schema !== CURRENT_SCHEMA_URL) {
      return [
        {
          message: `"$schema" should reference the current server.json schema "${CURRENT_SCHEMA_URL}".`,
          path: [...basePath, '$schema'],
        },
      ];
    }

    return;
  },
);

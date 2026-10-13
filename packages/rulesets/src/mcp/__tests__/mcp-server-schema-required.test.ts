import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-server-schema-required', [
  {
    name: 'current schema',
    document: validServer,
    errors: [],
  },
  {
    name: 'older schema',
    document: server({ $schema: 'https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json' }),
    errors: [],
  },
  {
    name: 'missing $schema',
    document: server({ $schema: void 0 }),
    errors: [
      {
        message:
          '"$schema" must be set to "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json"; the MCP registry requires it.',
        path: [],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

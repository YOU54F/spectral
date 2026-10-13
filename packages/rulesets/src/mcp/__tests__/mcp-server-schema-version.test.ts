import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-server-schema-version', [
  {
    name: 'current schema',
    document: validServer,
    errors: [],
  },
  {
    name: 'missing $schema is left to mcp-server-schema-required',
    document: server({ $schema: void 0 }),
    errors: [],
  },
  {
    name: 'older schema',
    document: server({ $schema: 'https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json' }),
    errors: [
      {
        message:
          '"$schema" should reference the current server.json schema "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json".',
        path: ['$schema'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

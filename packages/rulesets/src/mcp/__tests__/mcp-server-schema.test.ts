import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-server-schema', [
  {
    name: 'valid server.json',
    document: validServer,
    errors: [],
  },
  {
    name: 'missing required properties',
    document: { $schema: validServer.$schema, name: 'io.github.example/weather', packages: [] },
    errors: [
      {
        message: 'must have required property "description"',
        path: [],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'must have required property "version"',
        path: [],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'name does not match the schema pattern',
    document: server({ name: 'weather' }),
    errors: [
      {
        message: '"name" property must match pattern "^[a-zA-Z0-9.-]+/[a-zA-Z0-9._-]+$"',
        path: ['name'],
      },
    ],
  },
  {
    name: 'package version is "latest"',
    document: server({
      packages: [{ registryType: 'npm', identifier: 'weather', version: 'latest', transport: { type: 'stdio' } }],
    }),
    errors: [
      {
        message: '"version" property must not be valid',
        path: ['packages', '0', 'version'],
      },
    ],
  },
  {
    name: 'unknown transport type',
    document: server({
      packages: [{ registryType: 'npm', identifier: 'weather', version: '1.0.0', transport: { type: 'stdo' } }],
    }),
    errors: [
      {
        message:
          '"type" property must be equal to one of the allowed values: "stdio", "streamable-http", "sse". Did you mean "stdio"?',
        path: ['packages', '0', 'transport', 'type'],
      },
    ],
  },
]);

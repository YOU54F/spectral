import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-version-not-latest', [
  {
    name: 'specific versions',
    document: validServer,
    errors: [],
  },
  {
    name: 'server and package version are "latest"',
    document: server({
      version: 'latest',
      packages: [{ registryType: 'npm', identifier: 'weather', version: 'latest', transport: { type: 'stdio' } }],
    }),
    errors: [
      {
        message: 'Version must be a specific version, not "latest".',
        path: ['version'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Version must be a specific version, not "latest".',
        path: ['packages', '0', 'version'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

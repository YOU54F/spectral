import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server } from './__helpers__/tester';

testRule('mcp-server-version-semver', [
  {
    name: 'semantic version',
    document: server({ version: '1.2.3-beta.1+build.5' }),
    errors: [],
  },
  {
    name: 'non-semantic version',
    document: server({ version: '2025.01' }),
    errors: [
      {
        message: 'Server version "2025.01" should be a semantic version (e.g. "1.0.0").',
        path: ['version'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

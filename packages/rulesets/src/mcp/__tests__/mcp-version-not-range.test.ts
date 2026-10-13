import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server } from './__helpers__/tester';

const withPackageVersion = (version: string): Record<string, unknown> =>
  server({ packages: [{ registryType: 'npm', identifier: 'weather', version, transport: { type: 'stdio' } }] });

testRule('mcp-version-not-range', [
  ...['1.2.3', 'v1.2.3', '1.0.0-rc.1', '2025.1.15'].map(version => ({
    name: `specific version ${version}`,
    document: withPackageVersion(version),
    errors: [],
  })),
  ...['^1.2.3', '~1.2', '>=1.0.0', '1.x', '1.2.*', '*', '1.0.0 - 2.0.0', '1.0.0 || 2.0.0'].map(version => ({
    name: `version range ${version}`,
    document: withPackageVersion(version),
    errors: [
      {
        message: `Version "${version}" looks like a version range. Use a specific version (e.g. "1.2.3") instead.`,
        path: ['packages', '0', 'version'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  })),
  {
    name: 'server version range',
    document: server({ version: '^1.0.0' }),
    errors: [
      {
        message: 'Version "^1.0.0" looks like a version range. Use a specific version (e.g. "1.2.3") instead.',
        path: ['version'],
      },
    ],
  },
]);

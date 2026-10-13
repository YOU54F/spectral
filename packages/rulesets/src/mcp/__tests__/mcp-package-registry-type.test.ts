import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server } from './__helpers__/tester';

const withRegistryType = (registryType: string): Record<string, unknown> =>
  server({
    packages: [
      {
        registryType,
        identifier: 'weather',
        version: '1.0.0',
        fileSha256: 'a'.repeat(64),
        transport: { type: 'stdio' },
      },
    ],
  });

testRule('mcp-package-registry-type', [
  ...['npm', 'pypi', 'oci', 'nuget', 'mcpb', 'cargo'].map(registryType => ({
    name: `supported registry type ${registryType}`,
    document: withRegistryType(registryType),
    errors: [],
  })),
  {
    name: 'unsupported registry type',
    document: withRegistryType('maven'),
    errors: [
      {
        message: '"maven" must be equal to one of the allowed values: "npm", "pypi", "oci", "nuget", "mcpb", "cargo"',
        path: ['packages', '0', 'registryType'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

const dockerPackage = {
  registryType: 'oci',
  identifier: 'docker.io/example/weather:1.0.0',
  transport: { type: 'stdio' },
  runtimeArguments: [{ type: 'named', name: '--rm' }],
};

testRule('mcp-package-runtime-hint', [
  {
    name: 'no runtime arguments',
    document: validServer,
    errors: [],
  },
  {
    name: 'runtime arguments with runtimeHint',
    document: server({ packages: [{ ...dockerPackage, runtimeHint: 'docker' }] }),
    errors: [],
  },
  {
    name: 'runtime arguments without runtimeHint',
    document: server({ packages: [dockerPackage] }),
    errors: [
      {
        message: 'Package with "runtimeArguments" should specify a "runtimeHint" (e.g. "npx", "uvx", "docker", "dnx").',
        path: ['packages', '0'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

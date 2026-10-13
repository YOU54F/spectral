import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-package-identifier', [
  {
    name: 'valid identifier',
    document: validServer,
    errors: [],
  },
  {
    name: 'identifier with spaces',
    document: server({
      packages: [
        { registryType: 'npm', identifier: '@example/weather mcp', version: '1.0.0', transport: { type: 'stdio' } },
      ],
    }),
    errors: [
      {
        message: 'Package "identifier" must not contain whitespace.',
        path: ['packages', '0', 'identifier'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

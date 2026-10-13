import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-server-description', [
  {
    name: 'has description',
    document: validServer,
    errors: [],
  },
  {
    name: 'blank description',
    document: server({ description: '   ' }),
    errors: [
      {
        message: 'Server "description" must not be empty.',
        path: ['description'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'missing description is reported by mcp-server-schema',
    document: server({ description: void 0 }),
    errors: [],
  },
]);

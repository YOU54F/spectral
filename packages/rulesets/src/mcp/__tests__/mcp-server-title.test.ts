import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-server-title', [
  {
    name: 'has title',
    document: validServer,
    errors: [],
  },
  {
    name: 'title is optional',
    document: server({ title: void 0 }),
    errors: [],
  },
  {
    name: 'whitespace-only title',
    document: server({ title: ' \t ' }),
    errors: [
      {
        message: 'Server "title" must not be blank.',
        path: ['title'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

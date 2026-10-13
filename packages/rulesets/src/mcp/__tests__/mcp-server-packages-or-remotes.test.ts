import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server } from './__helpers__/tester';

testRule('mcp-server-packages-or-remotes', [
  {
    name: 'packages only',
    document: server({ remotes: void 0 }),
    errors: [],
  },
  {
    name: 'remotes only',
    document: server({ packages: [] }),
    errors: [],
  },
  {
    name: 'neither packages nor remotes',
    document: server({ packages: [], remotes: void 0 }),
    errors: [
      {
        message: 'Server should define at least one entry in "packages" or "remotes".',
        path: [],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

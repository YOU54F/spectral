import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

const withRemote = (remote: Record<string, unknown>): Record<string, unknown> =>
  server({ remotes: [{ type: 'streamable-http', ...remote }] });

testRule('mcp-remote-url', [
  {
    name: 'https remote',
    document: validServer,
    errors: [],
  },
  {
    name: 'templated remote with defined variables',
    document: withRemote({
      url: 'https://{tenant}.example.com/mcp',
      variables: { tenant: { isRequired: true } },
    }),
    errors: [],
  },
  {
    name: 'http remote',
    document: withRemote({ url: 'http://weather.example.com/mcp' }),
    errors: [
      {
        message: 'Remote URL must use https.',
        path: ['remotes', '0', 'url'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  ...['https://localhost/mcp', 'https://127.0.0.1:8443/mcp', 'https://weather.localhost/mcp'].map(url => ({
    name: `local remote ${url}`,
    document: withRemote({ url }),
    errors: [
      {
        message: 'Remote URL must be publicly reachable, not localhost.',
        path: ['remotes', '0', 'url'],
      },
    ],
  })),
  {
    name: 'undefined remote variable',
    document: withRemote({ url: 'https://{tenant}.example.com/mcp' }),
    errors: [
      {
        message: 'Remote URL variable "{tenant}" must be defined in "variables".',
        path: ['remotes', '0', 'url'],
      },
    ],
  },
  {
    name: 'invalid remote url',
    document: withRemote({ url: 'https://' }),
    errors: [
      {
        message: 'Remote URL "https://" is not a valid URL.',
        path: ['remotes', '0', 'url'],
      },
    ],
  },
]);

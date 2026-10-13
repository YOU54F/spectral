import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-repository-url', [
  {
    name: 'GitHub repository',
    document: validServer,
    errors: [],
  },
  {
    name: 'GitLab repository',
    document: server({ repository: { url: 'https://gitlab.com/example/weather/', source: 'gitlab' } }),
    errors: [],
  },
  {
    name: 'other source with https URL',
    document: server({ repository: { url: 'https://git.example.com/weather', source: 'gitea' } }),
    errors: [],
  },
  ...[
    'https://github.com/example/weather.git/tree/main',
    'https://github.com/example',
    'https://gitlab.com/example/weather',
  ].map(url => ({
    name: `GitHub repository with invalid URL ${url}`,
    document: server({ repository: { url, source: 'github' } }),
    errors: [
      {
        message:
          'Repository URL must point to a github repository (e.g. "https://github.com/owner/repo"), without a ".git" suffix or extra path segments.',
        path: ['repository', 'url'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  })),
  {
    name: 'other source with http URL',
    document: server({ repository: { url: 'http://git.example.com/weather', source: 'gitea' } }),
    errors: [
      {
        message: 'Repository URL must be an absolute https URL.',
        path: ['repository', 'url'],
      },
    ],
  },
]);

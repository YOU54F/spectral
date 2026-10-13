import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

const withEnv = (environmentVariables: unknown[]): Record<string, unknown> =>
  server({
    packages: [
      {
        registryType: 'npm',
        identifier: 'weather',
        version: '1.0.0',
        transport: { type: 'stdio' },
        environmentVariables,
      },
    ],
  });

testRule('mcp-secret-input', [
  {
    name: 'secret marked isSecret',
    document: validServer,
    errors: [],
  },
  {
    name: 'non-secret inputs',
    document: withEnv([{ name: 'LOG_LEVEL' }, { name: 'TOKENIZER_MODEL' }, { name: 'KEYBOARD_LAYOUT' }]),
    errors: [],
  },
  {
    name: 'secret value uses a variable',
    document: server({
      remotes: [
        {
          type: 'streamable-http',
          url: 'https://weather.example.com/mcp',
          headers: [
            {
              name: 'Authorization',
              value: 'Bearer {api_token}',
              isSecret: true,
              variables: { api_token: { isSecret: true, isRequired: true } },
            },
          ],
        },
      ],
    }),
    errors: [],
  },
  ...[
    'GITHUB_TOKEN',
    'DB_PASSWORD',
    'OPENAI_API_KEY',
    'apiKey',
    'client-secret',
    'AWS_ACCESS_KEY_ID',
    'GITLAB_PAT',
  ].map(name => ({
    name: `${name} without isSecret`,
    document: withEnv([{ name }]),
    errors: [
      {
        message: `Input "${name}" looks like a secret and should set "isSecret": true.`,
        path: ['packages', '0', 'environmentVariables', '0'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  })),
  {
    name: 'hard-coded secret header and variable',
    document: server({
      remotes: [
        {
          type: 'streamable-http',
          url: 'https://weather.example.com/mcp',
          headers: [
            {
              name: 'X-API-Key',
              value: 'sk-123',
              isSecret: true,
              variables: { token: { default: 'abc' } },
            },
          ],
        },
      ],
    }),
    errors: [
      {
        message:
          'Input "X-API-Key" looks like a secret and must not hard-code a "value"; use a "{variable}" placeholder instead.',
        path: ['remotes', '0', 'headers', '0', 'value'],
      },
      {
        message: 'Input "token" looks like a secret and should set "isSecret": true.',
        path: ['remotes', '0', 'headers', '0', 'variables', 'token'],
      },
      {
        message:
          'Input "token" looks like a secret and must not hard-code a "default"; use a "{variable}" placeholder instead.',
        path: ['remotes', '0', 'headers', '0', 'variables', 'token', 'default'],
      },
    ],
  },
  {
    name: 'secret argument without isSecret',
    document: server({
      packages: [
        {
          registryType: 'pypi',
          identifier: 'weather',
          transport: { type: 'stdio' },
          packageArguments: [{ type: 'positional', valueHint: 'api_key' }],
        },
      ],
    }),
    errors: [
      {
        message: 'Input "api_key" looks like a secret and should set "isSecret": true.',
        path: ['packages', '0', 'packageArguments', '0'],
      },
    ],
  },
]);

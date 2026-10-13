import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server } from './__helpers__/tester';

const withArguments = (args: unknown[]): Record<string, unknown> =>
  server({
    packages: [
      {
        registryType: 'npm',
        identifier: 'weather',
        version: '1.0.0',
        runtimeHint: 'npx',
        transport: { type: 'stdio' },
        packageArguments: args,
        runtimeArguments: args,
      },
    ],
  });

testRule('mcp-named-argument', [
  {
    name: 'valid named and positional arguments',
    document: withArguments([
      { type: 'named', name: '--units', default: 'metric' },
      { type: 'positional', value: '--units=metric' },
    ]),
    errors: [],
  },
  {
    name: 'name with invalid characters',
    document: server({
      packages: [
        {
          registryType: 'npm',
          identifier: 'weather',
          transport: { type: 'stdio' },
          packageArguments: [{ type: 'named', name: '--units <unit>' }],
        },
      ],
    }),
    errors: [
      {
        message: 'Named argument name "--units <unit>" must not contain spaces, "<", ">" or "$".',
        path: ['packages', '0', 'packageArguments', '0', 'name'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'value and default repeating the name',
    document: server({
      packages: [
        {
          registryType: 'npm',
          identifier: 'weather',
          runtimeHint: 'npx',
          transport: { type: 'stdio' },
          runtimeArguments: [{ type: 'named', name: '--units', value: '--units=metric', default: '--units metric' }],
        },
      ],
    }),
    errors: [
      {
        message: 'Named argument "value" must not repeat the argument name "--units"; the name is added automatically.',
        path: ['packages', '0', 'runtimeArguments', '0', 'value'],
      },
      {
        message:
          'Named argument "default" must not repeat the argument name "--units"; the name is added automatically.',
        path: ['packages', '0', 'runtimeArguments', '0', 'default'],
      },
    ],
  },
]);

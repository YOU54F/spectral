import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

const withPackage = (pkg: Record<string, unknown>): Record<string, unknown> =>
  server({ packages: [{ registryType: 'npm', identifier: 'weather', version: '1.0.0', ...pkg }] });

testRule('mcp-package-transport', [
  {
    name: 'stdio transport',
    document: validServer,
    errors: [],
  },
  {
    name: 'streamable-http transport with variables from environment variables and arguments',
    document: withPackage({
      transport: { type: 'streamable-http', url: 'http://{host}:{port}/mcp' },
      environmentVariables: [{ name: 'host' }],
      packageArguments: [{ type: 'named', name: '--port', default: '8080' }],
    }),
    errors: [],
  },
  {
    name: 'positional argument value hint can be used as a variable',
    document: withPackage({
      transport: { type: 'sse', url: 'http://localhost:{port}/sse' },
      packageArguments: [{ type: 'positional', valueHint: 'port' }],
    }),
    errors: [],
  },
  {
    name: 'stdio transport with url',
    document: withPackage({ transport: { type: 'stdio', url: 'http://localhost:8080/mcp' } }),
    errors: [
      {
        message: 'Transport of type "stdio" must not specify a "url".',
        path: ['packages', '0', 'transport', 'url'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'streamable-http transport without url',
    document: withPackage({ transport: { type: 'streamable-http' } }),
    errors: [
      {
        message: 'Transport of type "streamable-http" must specify a "url".',
        path: ['packages', '0', 'transport'],
      },
    ],
  },
  {
    name: 'undefined url variable',
    document: withPackage({ transport: { type: 'sse', url: 'http://localhost:{port}/sse' } }),
    errors: [
      {
        message: 'Transport URL variable "{port}" must match an environment variable or argument name of the package.',
        path: ['packages', '0', 'transport', 'url'],
      },
    ],
  },
  {
    name: 'invalid url',
    document: withPackage({ transport: { type: 'sse', url: 'http://exa mple.com/sse' } }),
    errors: [
      {
        message: 'Transport URL "http://exa mple.com/sse" is not a valid URL.',
        path: ['packages', '0', 'transport', 'url'],
      },
    ],
  },
]);

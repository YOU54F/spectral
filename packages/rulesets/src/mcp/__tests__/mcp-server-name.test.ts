import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server } from './__helpers__/tester';

testRule('mcp-server-name', [
  {
    name: 'reverse-DNS GitHub namespace',
    document: server({ name: 'io.github.example/weather' }),
    errors: [],
  },
  {
    name: 'reverse-DNS domain namespace',
    document: server({ name: 'com.example.api/weather-server_v2' }),
    errors: [],
  },
  {
    name: 'more than one slash',
    document: server({ name: 'io.github.example/weather/extra' }),
    errors: [
      {
        message: 'Server name must contain exactly one "/" separating the namespace and the server name.',
        path: ['name'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'parts starting or ending with a non-alphanumeric character',
    document: server({ name: '.io.github.example/weather-' }),
    errors: [
      {
        message:
          'Server name must be in "namespace/name" format, where both parts start and end with an alphanumeric character.',
        path: ['name'],
      },
    ],
  },
  {
    name: 'namespace is not reverse-DNS',
    document: server({ name: 'example/weather' }),
    errors: [
      {
        message:
          'Server name namespace should use reverse-DNS notation (e.g. "io.github.username/server" or "com.example/server").',
        path: ['name'],
      },
    ],
  },
]);

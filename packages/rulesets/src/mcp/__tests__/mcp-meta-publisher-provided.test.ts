import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

const KEY = 'io.modelcontextprotocol.registry/publisher-provided';

testRule('mcp-meta-publisher-provided', [
  {
    name: 'no _meta',
    document: validServer,
    errors: [],
  },
  {
    name: 'publisher-provided metadata',
    document: server({ _meta: { [KEY]: { tool: 'publisher-cli', version: '1.0.0' } } }),
    errors: [],
  },
  {
    name: 'unknown _meta key',
    document: server({ _meta: { 'com.example/build': { commit: 'abc' } } }),
    errors: [
      {
        message: `"_meta" key "com.example/build" is not preserved by the MCP registry; only "${KEY}" is kept.`,
        path: ['_meta', 'com.example/build'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'publisher-provided metadata over 4KB',
    document: server({ _meta: { [KEY]: { notes: 'x'.repeat(4096) } } }),
    errors: [
      {
        message: `"${KEY}" must not exceed 4096 bytes when serialized.`,
        path: ['_meta', KEY],
      },
    ],
  },
]);

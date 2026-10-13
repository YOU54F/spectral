import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-method-name-reserved', [
  {
    name: 'regular method names',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'rpc.discover is allowed',
    document: modifyDocument(doc => {
      doc.methods[1].name = 'rpc.discover';
    }),
    errors: [],
  },
  {
    name: 'names merely containing rpc are allowed',
    document: modifyDocument(doc => {
      doc.methods[1].name = 'grpc.call';
    }),
    errors: [],
  },
  {
    name: 'method name starting with rpc.',
    document: modifyDocument(doc => {
      doc.methods[1].name = 'rpc.ping';
    }),
    errors: [
      {
        message: 'Method name "rpc.ping" must not begin with "rpc." (reserved for JSON-RPC internal methods).',
        path: ['methods', '1', 'name'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

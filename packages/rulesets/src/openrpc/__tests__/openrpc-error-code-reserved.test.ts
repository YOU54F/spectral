import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { modifyDocument } from './__helpers__/document';

testRule('openrpc-error-code-reserved', [
  {
    name: 'application and pre-defined codes',
    document: modifyDocument(doc => {
      doc.methods[0].errors = [
        { code: -32700, message: 'Parse error' },
        { code: -32600, message: 'Invalid Request' },
        { code: -32601, message: 'Method not found' },
        { code: -32603, message: 'Internal error' },
        { code: -32099, message: 'Server error' },
        { code: -32000, message: 'Server error' },
        { code: -32769, message: 'Application error' },
        { code: -31999, message: 'Application error' },
        { code: 1, message: 'Application error' },
      ];
    }),
    errors: [],
  },
  {
    name: 'reserved codes in methods and components',
    document: modifyDocument(doc => {
      doc.methods[0].errors[1].code = -32604;
      doc.components.errors.NotFound.code = -32768;
    }),
    errors: [
      {
        message:
          'Error code "-32604" is in the range reserved by JSON-RPC (-32768 to -32000) and is not a pre-defined or server error code.',
        path: ['methods', '0', 'errors', '1', 'code'],
        severity: DiagnosticSeverity.Warning,
      },
      {
        path: ['components', 'errors', 'NotFound', 'code'],
      },
    ],
  },
]);

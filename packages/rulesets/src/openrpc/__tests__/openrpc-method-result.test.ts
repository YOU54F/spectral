import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-method-result', [
  {
    name: 'methods have a result',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'result is missing',
    document: modifyDocument(doc => {
      delete doc.methods[1].result;
    }),
    errors: [
      {
        message: 'Method has no "result" and can only be used as a notification.',
        path: ['methods', '1'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

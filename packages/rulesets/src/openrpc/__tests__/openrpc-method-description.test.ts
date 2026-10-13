import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-method-description', [
  {
    name: 'summary or description is present',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'neither summary nor description',
    document: modifyDocument(doc => {
      delete doc.methods[0].summary;
    }),
    errors: [
      {
        message: 'Method should have a "summary" or a "description".',
        path: ['methods', '0'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

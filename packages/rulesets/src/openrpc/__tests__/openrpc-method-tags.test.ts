import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-method-tags', [
  {
    name: 'methods have tags',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'tags are missing',
    document: modifyDocument(doc => {
      delete doc.methods[0].tags;
    }),
    errors: [
      {
        message: 'Method should have non-empty "tags".',
        path: ['methods', '0'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'tags are empty',
    document: modifyDocument(doc => {
      doc.methods[1].tags = [];
    }),
    errors: [{ path: ['methods', '1', 'tags'] }],
  },
]);

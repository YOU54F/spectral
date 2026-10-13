import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-info-description', [
  {
    name: 'description is present',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'description is missing',
    document: modifyDocument(doc => {
      delete doc.info.description;
    }),
    errors: [
      {
        message: 'Info object should have a "description".',
        path: ['info'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

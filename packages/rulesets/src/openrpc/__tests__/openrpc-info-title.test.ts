import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-info-title', [
  {
    name: 'title is present',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'title is missing',
    document: modifyDocument(doc => {
      delete doc.info.title;
    }),
    errors: [
      { message: 'Info object must have a non-empty "title".', path: ['info'], severity: DiagnosticSeverity.Warning },
    ],
  },
  {
    name: 'title is empty',
    document: modifyDocument(doc => {
      doc.info.title = '';
    }),
    errors: [{ path: ['info', 'title'] }],
  },
]);

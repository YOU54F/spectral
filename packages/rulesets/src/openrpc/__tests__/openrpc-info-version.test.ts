import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-info-version', [
  {
    name: 'version is present',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'version is missing',
    document: modifyDocument(doc => {
      delete doc.info.version;
    }),
    errors: [
      { message: 'Info object must have a non-empty "version".', path: ['info'], severity: DiagnosticSeverity.Warning },
    ],
  },
  {
    name: 'version is empty',
    document: modifyDocument(doc => {
      doc.info.version = '';
    }),
    errors: [{ path: ['info', 'version'] }],
  },
]);

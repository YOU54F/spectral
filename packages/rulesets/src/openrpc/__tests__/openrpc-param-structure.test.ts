import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-param-structure', [
  {
    name: 'valid paramStructure',
    document: modifyDocument(doc => {
      doc.methods[1].paramStructure = 'by-position';
    }),
    errors: [],
  },
  {
    name: 'paramStructure is optional',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'invalid paramStructure',
    document: modifyDocument(doc => {
      doc.methods[0].paramStructure = 'by-nme';
    }),
    errors: [
      {
        message: '"paramStructure" must be one of "by-position", "by-name" or "either".',
        path: ['methods', '0', 'paramStructure'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

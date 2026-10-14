import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-method-name-unique', [
  {
    name: 'method names are unique',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'duplicated method name',
    document: modifyDocument(doc => {
      doc.methods.push({ ...doc.methods[1] });
    }),
    errors: [
      {
        message: 'Method name "pet_created" must be unique within the document.',
        path: ['methods', '2', 'name'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

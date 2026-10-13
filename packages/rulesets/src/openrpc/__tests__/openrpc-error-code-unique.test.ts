import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-error-code-unique', [
  {
    name: 'error codes are unique',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'duplicated code, including referenced errors',
    document: modifyDocument(doc => {
      doc.methods[0].errors[1].code = 404;
    }),
    errors: [
      {
        message: 'Error code "404" must be unique within the method.',
        path: ['methods', '0', 'errors', '1', 'code'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

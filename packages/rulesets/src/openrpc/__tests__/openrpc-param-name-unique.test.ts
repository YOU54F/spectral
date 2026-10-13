import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-param-name-unique', [
  {
    name: 'param names are unique',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'same param name in different methods',
    document: modifyDocument(doc => {
      doc.methods[1].params[0].name = 'offset';
    }),
    errors: [],
  },
  {
    name: 'duplicated param name, including referenced params',
    document: modifyDocument(doc => {
      doc.methods[0].params[1].name = 'limit';
    }),
    errors: [
      {
        message: 'Param name "limit" must be unique within the method.',
        path: ['methods', '0', 'params', '1', 'name'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

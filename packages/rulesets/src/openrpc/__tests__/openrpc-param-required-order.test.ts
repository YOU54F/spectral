import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-param-required-order', [
  {
    name: 'required params come first',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'only optional params',
    document: modifyDocument(doc => {
      doc.components.contentDescriptors.limit.required = false;
    }),
    errors: [],
  },
  {
    name: 'required param after an optional param (required defaults to false)',
    document: modifyDocument(doc => {
      doc.methods[0].params.reverse();
    }),
    errors: [
      {
        message: 'Required param "limit" must not follow optional param "offset".',
        path: ['methods', '0', 'params', '1'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

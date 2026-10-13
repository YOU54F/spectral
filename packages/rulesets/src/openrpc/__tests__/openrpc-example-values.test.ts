import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-example-values', [
  {
    name: 'example values match the schemas',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'invalid param value',
    document: modifyDocument(doc => {
      doc.methods[0].examples[0].params[0].value = 'ten';
    }),
    errors: [
      {
        message: '"value" property type must be integer',
        path: ['methods', '0', 'examples', '0', 'params', '0', 'value'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'invalid result value, with referenced schemas',
    document: modifyDocument(doc => {
      doc.methods[0].examples[0].result.value = [{ id: 1 }];
    }),
    errors: [
      {
        message: '"0" property must have required property "name"',
        path: ['methods', '0', 'examples', '0', 'result', 'value', '0'],
      },
    ],
  },
  {
    name: 'invalid referenced example',
    document: modifyDocument(doc => {
      doc.components.examples.limitTen.value = 0;
    }),
    errors: [
      {
        message: '"value" property must be >= 1',
        path: ['methods', '0', 'examples', '1', 'params', '0', 'value'],
      },
    ],
  },
]);

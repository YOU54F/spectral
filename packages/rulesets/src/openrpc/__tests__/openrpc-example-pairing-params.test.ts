import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-example-pairing-params', [
  {
    name: 'examples match the params',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'optional params may be omitted',
    document: modifyDocument(doc => {
      doc.methods[0].examples[0].params.pop();
    }),
    errors: [],
  },
  {
    name: 'unknown example param',
    document: modifyDocument(doc => {
      doc.methods[0].examples[0].params[1].name = 'page';
    }),
    errors: [
      {
        message: 'Example param "page" of pairing "firstPage" is not a param of method "list_pets".',
        path: ['methods', '0', 'examples', '0', 'params', '1', 'name'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'missing required param, including referenced pairings',
    document: modifyDocument(doc => {
      doc.components.examples.limitTen.name = 'offset';
    }),
    errors: [
      {
        message: 'Example pairing "secondPage" is missing required param "limit".',
        path: ['methods', '0', 'examples', '1', 'params'],
      },
    ],
  },
  {
    name: 'result on a notification',
    document: modifyDocument(doc => {
      delete doc.methods[1].result;
      doc.methods[1].examples = [
        {
          name: 'created',
          params: [{ name: 'pet', value: { id: 1, name: 'Rex' } }],
          result: { name: 'ack', value: null },
        },
      ];
    }),
    errors: [
      {
        message:
          'Example pairing "created" has a result, but method "pet_created" has no result (it is a notification).',
        path: ['methods', '1', 'examples', '0', 'result'],
      },
    ],
  },
]);

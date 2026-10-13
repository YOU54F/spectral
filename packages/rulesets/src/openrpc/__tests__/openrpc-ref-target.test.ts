import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-ref-target', [
  {
    name: 'all references point to the right components',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'external references are ignored',
    document: modifyDocument(doc => {
      doc.methods[0].params[0] = { $ref: './params.json#/limit' };
    }),
    errors: [],
  },
  {
    name: 'param pointing to the wrong section',
    document: modifyDocument(doc => {
      doc.methods[0].params[0] = { $ref: '#/components/schemas/Pet' };
    }),
    errors: [
      {
        message: '"$ref" must point to an entry of "#/components/contentDescriptors", got "#/components/schemas/Pet".',
        path: ['methods', '0', 'params', '0', '$ref'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'result, error, tag and example pairing pointing to the wrong section',
    document: modifyDocument(doc => {
      doc.methods[0].result = { $ref: '#/components/errors/NotFound' };
      doc.methods[0].errors[0] = { $ref: '#/components/tags/pets' };
      doc.methods[0].tags[0] = { $ref: '#/components/errors/NotFound' };
      doc.methods[0].examples[1] = { $ref: '#/components/examples/limitTen' };
    }),
    errors: [
      { path: ['methods', '0', 'tags', '0', '$ref'] },
      {
        message:
          '"$ref" must point to an entry of "#/components/contentDescriptors", got "#/components/errors/NotFound".',
        path: ['methods', '0', 'result', '$ref'],
      },
      { path: ['methods', '0', 'errors', '0', '$ref'] },
      { path: ['methods', '0', 'examples', '1', '$ref'] },
    ],
  },
  {
    name: 'example pairing params must point to examples',
    document: modifyDocument(doc => {
      doc.components.examplePairings.secondPage.params[0] = { $ref: '#/components/contentDescriptors/limit' };
    }),
    errors: [
      {
        message:
          '"$ref" must point to an entry of "#/components/examples", got "#/components/contentDescriptors/limit".',
        path: ['components', 'examplePairings', 'secondPage', 'params', '0', '$ref'],
      },
    ],
  },
  {
    name: 'reference target does not exist',
    document: modifyDocument(doc => {
      doc.methods[0].errors[0] = { $ref: '#/components/errors/Missing' };
    }),
    errors: [
      {
        message: '"$ref" target "#/components/errors/Missing" does not exist in the document.',
        path: ['methods', '0', 'errors', '0', '$ref'],
      },
    ],
  },
]);

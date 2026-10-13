import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-schema', [
  {
    name: 'valid 1.3 document',
    document: createDocument('1.3.2'),
    errors: [],
  },
  {
    name: 'valid 1.4 document',
    document: createDocument('1.4.1'),
    errors: [],
  },
  {
    name: 'valid minimal document',
    document: { openrpc: '1.0.0', info: { title: 'x', version: '1' }, methods: [] },
    errors: [],
  },
  {
    name: 'missing required properties',
    document: { openrpc: '1.3.2' },
    errors: [
      { message: 'must have required property "info"', path: [], severity: DiagnosticSeverity.Error },
      { message: 'must have required property "methods"', path: [], severity: DiagnosticSeverity.Error },
    ],
  },
  {
    name: 'unknown property',
    document: modifyDocument(doc => {
      doc.paths = {};
    }),
    errors: [{ message: 'Property "paths" is not expected to be here', path: ['paths'] }],
  },
  {
    name: 'specification extensions are allowed',
    document: modifyDocument(doc => {
      doc['x-foo'] = true;
      doc.methods[0]['x-bar'] = 1;
    }),
    errors: [],
  },
  {
    name: 'content descriptor without schema',
    document: modifyDocument(doc => {
      delete doc.methods[0].params[1].schema;
    }),
    errors: [{ message: '"1" property must have required property "schema"', path: ['methods', '0', 'params', '1'] }],
  },
  {
    name: 'non-integer error code',
    document: modifyDocument(doc => {
      doc.methods[0].errors[1].code = 1.5;
    }),
    errors: [{ message: '"code" property must be integer', path: ['methods', '0', 'errors', '1', 'code'] }],
  },
  {
    name: 'invalid JSON schema type, with a suggestion',
    document: modifyDocument(doc => {
      doc.methods[0].result.schema.type = 'aray';
    }),
    errors: [
      {
        message: expect.stringContaining('Did you mean "array"?'),
        path: ['methods', '0', 'result', 'schema', 'type'],
      },
    ],
  },
  {
    name: '1.4 version is validated against the 1.4 schema',
    document: { openrpc: '1.4.0', info: { title: 'x', version: '1' }, methods: [] },
    errors: [],
  },
  {
    name: 'server url templates and paramStructure are left to dedicated rules',
    document: modifyDocument(doc => {
      doc.servers[0].url = '/{region}/rpc';
      doc.methods[0].paramStructure = 'by-nme';
    }),
    errors: [],
  },
]);

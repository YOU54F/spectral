import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-record-doc', [
  {
    name: 'documented records',
    document: { type: 'record', name: 'R', doc: 'A record', fields: [{ name: 'a', type: 'int' }] },
    errors: [],
  },
  {
    name: 'undocumented records',
    document: {
      type: 'record',
      name: 'R',
      namespace: 'ns',
      doc: ' ',
      fields: [{ name: 'a', type: { type: 'record', name: 'Inner', fields: [] } }],
    },
    errors: [
      { message: 'Record "ns.R" should have a "doc".', path: [], severity: DiagnosticSeverity.Information },
      { message: 'Record "ns.Inner" should have a "doc".', path: ['fields', '0', 'type'] },
    ],
  },
]);

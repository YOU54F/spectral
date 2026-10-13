import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-field-doc', [
  {
    name: 'documented fields',
    document: { type: 'record', name: 'R', fields: [{ name: 'a', type: 'int', doc: 'An int' }] },
    errors: [],
  },
  {
    name: 'undocumented fields',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: 'int', doc: 'An int' },
        { name: 'b', type: 'int' },
      ],
    },
    errors: [
      {
        message: 'Field "b" of record "R" should have a "doc".',
        path: ['fields', '1'],
        severity: DiagnosticSeverity.Information,
      },
    ],
  },
]);

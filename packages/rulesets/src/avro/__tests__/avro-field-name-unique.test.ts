import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-field-name-unique', [
  {
    name: 'unique field names (same names in different records)',
    document: {
      type: 'record',
      name: 'A',
      fields: [
        { name: 'id', type: 'long' },
        { name: 'b', type: { type: 'record', name: 'B', fields: [{ name: 'id', type: 'long' }] } },
      ],
    },
    errors: [],
  },
  {
    name: 'duplicate field names',
    document: {
      type: 'record',
      name: 'A',
      namespace: 'ns',
      fields: [
        { name: 'id', type: 'long' },
        { name: 'id', type: 'string' },
      ],
    },
    errors: [
      {
        message: 'Field "id" is already defined in record "ns.A".',
        path: ['fields', '1', 'name'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

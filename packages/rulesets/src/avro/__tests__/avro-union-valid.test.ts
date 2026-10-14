import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-union-valid', [
  {
    name: 'valid unions',
    document: {
      type: 'record',
      name: 'R',
      namespace: 'ns',
      fields: [
        {
          name: 'a',
          type: [
            'null',
            'string',
            { type: 'array', items: 'int' },
            { type: 'map', values: 'int' },
            { type: 'fixed', name: 'F1', size: 1 },
            { type: 'fixed', name: 'F2', size: 1 },
          ],
        },
        { name: 'b', type: ['F1', 'F2', 'R'] },
      ],
    },
    errors: [],
  },
  {
    name: 'duplicate and nested members',
    document: {
      type: 'record',
      name: 'R',
      namespace: 'ns',
      fields: [
        { name: 'f', type: { type: 'fixed', name: 'F', size: 1 } },
        {
          name: 'a',
          type: [
            'string',
            { type: 'string', logicalType: 'uuid' },
            ['null'],
            { type: 'array', items: 'int' },
            { type: 'array', items: 'string' },
            'F',
            'ns.F',
          ],
        },
      ],
    },
    errors: [
      {
        message: 'Union contains more than one "string" schema.',
        path: ['fields', '1', 'type', '1'],
        severity: DiagnosticSeverity.Error,
      },
      { message: 'Unions may not immediately contain other unions.', path: ['fields', '1', 'type', '2'] },
      { message: 'Union contains more than one "array" schema.', path: ['fields', '1', 'type', '4'] },
      { message: 'Union contains more than one "ns.F" schema.', path: ['fields', '1', 'type', '6'] },
    ],
  },
]);

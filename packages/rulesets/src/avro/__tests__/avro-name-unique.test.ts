import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-name-unique', [
  {
    name: 'same simple name in different namespaces',
    document: {
      type: 'record',
      name: 'Outer',
      namespace: 'a',
      fields: [
        { name: 'x', type: { type: 'fixed', name: 'Id', size: 4 } },
        { name: 'y', type: { type: 'fixed', name: 'Id', namespace: 'b', size: 4 } },
        { name: 'z', type: { type: 'fixed', name: 'c.Id', size: 4 } },
      ],
    },
    errors: [],
  },
  {
    name: 'duplicate full names (namespace inherited and explicit)',
    document: {
      type: 'record',
      name: 'Outer',
      namespace: 'a',
      fields: [
        { name: 'x', type: { type: 'enum', name: 'Id', symbols: ['A'] } },
        { name: 'y', type: { type: 'fixed', name: 'a.Id', size: 4 } },
        { name: 'z', type: { type: 'record', name: 'Outer', fields: [] } },
      ],
    },
    errors: [
      {
        message: 'Named type "a.Id" is already defined at "fields.0.type". Full names must be unique.',
        path: ['fields', '1', 'type', 'name'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Named type "a.Outer" is already defined at "#". Full names must be unique.',
        path: ['fields', '2', 'type', 'name'],
      },
    ],
  },
]);

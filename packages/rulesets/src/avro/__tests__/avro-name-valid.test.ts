import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-name-valid', [
  {
    name: 'valid names',
    document: {
      type: 'record',
      name: 'com.example.User_1',
      namespace: '',
      aliases: ['_Legacy', 'org.example.Old'],
      fields: [{ name: '_id', type: 'long', aliases: ['ID'] }],
    },
    errors: [],
  },
  {
    name: 'invalid names',
    document: {
      type: 'record',
      name: '1User',
      namespace: 'com..example',
      aliases: ['bad-alias'],
      fields: [
        { name: 'first-name', type: 'string', aliases: ['a.b'] },
        { name: 'status', type: { type: 'enum', name: 'com.example.', symbols: ['A'] } },
        { name: 'h', type: { type: 'fixed', name: 'int', size: 1 } },
      ],
    },
    errors: [
      {
        message: 'Name "1User" of record is not a valid Avro name. Each part must match [A-Za-z_][A-Za-z0-9_]*.',
        path: ['name'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Namespace "com..example" is not valid. It must be empty or a dot-separated sequence of names.',
        path: ['namespace'],
      },
      { message: 'Alias "bad-alias" is not a valid Avro name.', path: ['aliases', '0'] },
      {
        message: 'Field name "first-name" is not a valid Avro name. It must match [A-Za-z_][A-Za-z0-9_]*.',
        path: ['fields', '0', 'name'],
      },
      { message: 'Field alias "a.b" is not a valid Avro name.', path: ['fields', '0', 'aliases', '0'] },
      {
        message: 'Name "com.example." of enum is not a valid Avro name. Each part must match [A-Za-z_][A-Za-z0-9_]*.',
        path: ['fields', '1', 'type', 'name'],
      },
      {
        message: 'Name "int" of fixed must not redefine the primitive type "int".',
        path: ['fields', '2', 'type', 'name'],
      },
    ],
  },
]);

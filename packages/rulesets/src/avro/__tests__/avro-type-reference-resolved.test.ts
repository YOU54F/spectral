import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-type-reference-resolved', [
  {
    name: 'references resolve via full name, enclosing namespace, null namespace and recursion',
    document: [
      { type: 'enum', name: 'Global', symbols: ['A'] },
      {
        type: 'record',
        name: 'Node',
        namespace: 'com.example',
        fields: [
          { name: 'next', type: ['null', 'Node'], default: null },
          { name: 'self', type: 'com.example.Node' },
          { name: 'global', type: 'Global' },
          { name: 'inner', type: { type: 'fixed', name: 'Hash', namespace: 'other', size: 1 } },
          { name: 'inner2', type: 'other.Hash' },
          { name: 'obj', type: { type: 'Hash' } },
        ],
      },
    ],
    errors: [
      {
        message: 'Type "Hash" is not defined (looked up as "com.example.Hash" and "Hash").',
        path: ['1', 'fields', '5', 'type', 'type'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'unknown and forward references',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: 'Later' },
        { name: 'b', type: { type: 'array', items: 'com.example.Missing' } },
        { name: 'c', type: { type: 'enum', name: 'Later', symbols: ['X'] } },
      ],
    },
    errors: [
      {
        message: 'Type "Later" is referenced before it is defined. Avro requires named types to be defined before use.',
        path: ['fields', '0', 'type'],
      },
      {
        message: 'Type "com.example.Missing" is not defined.',
        path: ['fields', '1', 'type', 'items'],
      },
    ],
  },
]);

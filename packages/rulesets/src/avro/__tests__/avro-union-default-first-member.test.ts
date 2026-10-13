import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-union-default-first-member', [
  {
    name: 'defaults matching the first member',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: ['null', 'string'], default: null },
        { name: 'b', type: ['string', 'null'], default: 'x' },
        { name: 'c', type: ['string', 'null'], default: null },
        { name: 'd', type: ['int', 'string'] },
        { name: 'e', type: ['int', 'boolean'], default: 'invalid' },
      ],
    },
    errors: [],
  },
  {
    name: 'default matching a later member',
    document: {
      type: 'record',
      name: 'R',
      fields: [{ name: 'a', type: ['int', 'string'], default: 'x' }],
    },
    errors: [
      {
        message:
          'Default value of field "a" matches union member 1 (string), not the first member (int). Older Avro implementations reject this.',
        path: ['fields', '0', 'default'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

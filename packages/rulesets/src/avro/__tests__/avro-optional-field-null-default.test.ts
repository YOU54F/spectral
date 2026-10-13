import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-optional-field-null-default', [
  {
    name: 'optional fields with null first and null default',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: ['null', 'string'], default: null },
        { name: 'b', type: ['int', 'string'], default: 1 },
        { name: 'c', type: 'string' },
      ],
    },
    errors: [],
  },
  {
    name: 'badly declared optional fields',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: ['string', 'null'], default: 'x' },
        { name: 'b', type: ['null', 'string'] },
        { name: 'c', type: ['null', 'string'], default: 'x' },
      ],
    },
    errors: [
      {
        message: 'Optional field "a" should list "null" as the first member of its union.',
        path: ['fields', '0', 'type', '1'],
        severity: DiagnosticSeverity.Warning,
      },
      { message: 'Optional field "b" should declare "default": null.', path: ['fields', '1'] },
      { message: 'Optional field "c" should have "default": null.', path: ['fields', '2', 'default'] },
    ],
  },
]);

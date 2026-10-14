import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-field-default-valid', [
  {
    name: 'valid defaults',
    document: {
      type: 'record',
      name: 'R',
      namespace: 'ns',
      fields: [
        { name: 'n', type: 'null', default: null },
        { name: 'b', type: 'boolean', default: true },
        { name: 'i', type: 'int', default: -2147483648 },
        { name: 'l', type: 'long', default: 9007199254740991 },
        { name: 'f', type: 'float', default: 1.5 },
        { name: 'd', type: { type: 'double' }, default: 2 },
        { name: 'by', type: 'bytes', default: 'ÿ\u0000' },
        { name: 's', type: 'string', default: 'foo' },
        { name: 'e', type: { type: 'enum', name: 'E', symbols: ['A', 'B'] }, default: 'B' },
        { name: 'e2', type: 'E', default: 'A' },
        { name: 'fx', type: { type: 'fixed', name: 'F', size: 2 }, default: '«Í' },
        { name: 'a', type: { type: 'array', items: 'int' }, default: [1, 2] },
        { name: 'm', type: { type: 'map', values: 'ns.E' }, default: { x: 'A' } },
        { name: 'u', type: ['null', 'string'], default: null },
        { name: 'u2', type: ['string', 'null'], default: null },
        {
          name: 'r',
          type: {
            type: 'record',
            name: 'Inner',
            fields: [
              { name: 'x', type: 'int' },
              { name: 'y', type: 'string', default: 'y' },
            ],
          },
          default: { x: 1 },
        },
        { name: 'dec', type: { type: 'bytes', logicalType: 'decimal', precision: 4 }, default: '\u0001' },
        { name: 'unknown', type: 'Missing', default: 1 },
      ],
    },
    errors: [],
  },
  {
    name: 'invalid defaults',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'i', type: 'int', default: 2147483648 },
        { name: 'l', type: 'long', default: 1.5 },
        { name: 's', type: 'string', default: null },
        { name: 'by', type: 'bytes', default: 'Ā' },
        { name: 'e', type: { type: 'enum', name: 'E', symbols: ['A'] }, default: 'Z' },
        { name: 'fx', type: { type: 'fixed', name: 'F', size: 2 }, default: 'a' },
        { name: 'a', type: { type: 'array', items: 'int' }, default: ['x'] },
        { name: 'u', type: ['null', 'int'], default: 'x' },
        { name: 'r', type: { type: 'record', name: 'Inner', fields: [{ name: 'x', type: 'int' }] }, default: {} },
      ],
    },
    errors: [
      {
        message: 'Default value of field "i" does not match its type (int).',
        path: ['fields', '0', 'default'],
        severity: DiagnosticSeverity.Error,
      },
      { message: 'Default value of field "l" does not match its type (long).', path: ['fields', '1', 'default'] },
      { message: 'Default value of field "s" does not match its type (string).', path: ['fields', '2', 'default'] },
      { message: 'Default value of field "by" does not match its type (bytes).', path: ['fields', '3', 'default'] },
      {
        message: 'Default value of field "e" does not match its type (enum "E").',
        path: ['fields', '4', 'default'],
      },
      {
        message: 'Default value of field "fx" does not match its type (fixed "F").',
        path: ['fields', '5', 'default'],
      },
      { message: 'Default value of field "a" does not match its type (array).', path: ['fields', '6', 'default'] },
      {
        message: 'Default value of field "u" does not match its type (union [null, int]).',
        path: ['fields', '7', 'default'],
      },
      {
        message: 'Default value of field "r" does not match its type (record "Inner").',
        path: ['fields', '8', 'default'],
      },
    ],
  },
]);

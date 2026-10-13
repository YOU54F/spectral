import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-schema', [
  {
    name: 'valid record',
    document: {
      type: 'record',
      name: 'User',
      namespace: 'com.example',
      doc: 'A user',
      aliases: ['Person'],
      fields: [
        { name: 'id', type: 'long', order: 'descending' },
        { name: 'tags', type: { type: 'array', items: 'string' }, default: [] },
        { name: 'attrs', type: { type: 'map', values: ['null', 'string'] } },
        { name: 'kind', type: { type: 'enum', name: 'Kind', symbols: ['A', 'B'], default: 'A' } },
        { name: 'hash', type: { type: 'fixed', name: 'MD5', size: 16 } },
        { name: 'custom', type: { type: 'string', 'x-custom': true } },
      ],
    },
    errors: [],
  },
  {
    name: 'valid top-level union',
    document: [{ type: 'record', name: 'A', fields: [] }, 'A', 'null'],
    errors: [],
  },
  {
    name: 'record without fields',
    document: { type: 'record', name: 'User', fields: [{ name: 'a' }, { type: 'string' }] },
    errors: [
      {
        message: '"0" property must have required property "type"',
        path: ['fields', '0'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: '"1" property must have required property "name"',
        path: ['fields', '1'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'fixed with non-positive size',
    document: { type: 'fixed', name: 'F', size: 0 },
    errors: [
      {
        message: '"size" property must be a positive integer',
        path: ['size'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'array without items, map without values, invalid order',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: { type: 'array' } },
        { name: 'b', type: { type: 'map', items: 'string' } },
        { name: 'c', type: 'int', order: 'up' },
      ],
    },
    errors: [
      {
        message: '"type" property must have required property "items"',
        path: ['fields', '0', 'type'],
      },
      {
        message: '"type" property must have required property "values"',
        path: ['fields', '1', 'type'],
      },
      {
        message: '"order" property must be equal to one of the allowed values: "ascending", "descending", "ignore"',
        path: ['fields', '2', 'order'],
      },
    ],
  },
  {
    name: 'schema of the wrong JSON type',
    document: { type: 'record', name: 'R', fields: [{ name: 'a', type: 1 }] },
    errors: [
      {
        message: 'Avro schema must be a type name (string), a union (array) or a schema object',
        path: ['fields', '0', 'type'],
      },
    ],
  },
  {
    name: 'enum with non-string symbols',
    document: { type: 'enum', name: 'E', symbols: ['A', 1] },
    errors: [
      {
        message: '"1" property must be string',
        path: ['symbols', '1'],
      },
    ],
  },
]);

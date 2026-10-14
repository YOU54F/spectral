import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-logical-type-valid', [
  {
    name: 'valid logical types',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: { type: 'bytes', logicalType: 'decimal', precision: 10, scale: 2 } },
        { name: 'b', type: { type: 'fixed', name: 'D', size: 4, logicalType: 'decimal', precision: 9 } },
        { name: 'c', type: { type: 'bytes', logicalType: 'big-decimal' } },
        { name: 'd', type: { type: 'string', logicalType: 'uuid' } },
        { name: 'e', type: { type: 'fixed', name: 'U', size: 16, logicalType: 'uuid' } },
        { name: 'f', type: { type: 'int', logicalType: 'date' } },
        { name: 'g', type: { type: 'int', logicalType: 'time-millis' } },
        { name: 'h', type: { type: 'long', logicalType: 'time-micros' } },
        { name: 'i', type: { type: 'long', logicalType: 'timestamp-millis' } },
        { name: 'j', type: { type: 'long', logicalType: 'timestamp-micros' } },
        { name: 'k', type: { type: 'long', logicalType: 'timestamp-nanos' } },
        { name: 'l', type: { type: 'long', logicalType: 'local-timestamp-millis' } },
        { name: 'm', type: { type: 'long', logicalType: 'local-timestamp-micros' } },
        { name: 'n', type: { type: 'long', logicalType: 'local-timestamp-nanos' } },
        { name: 'o', type: { type: 'fixed', name: 'Dur', size: 12, logicalType: 'duration' } },
        { name: 'p', type: { type: 'string', logicalType: 'my-custom-type' } },
      ],
    },
    errors: [],
  },
  {
    name: 'invalid logical types',
    document: {
      type: 'record',
      name: 'R',
      fields: [
        { name: 'a', type: { type: 'string', logicalType: 'decimal', precision: 4 } },
        { name: 'b', type: { type: 'bytes', logicalType: 'decimal' } },
        { name: 'c', type: { type: 'bytes', logicalType: 'decimal', precision: 4, scale: 5 } },
        { name: 'd', type: { type: 'fixed', name: 'D', size: 4, logicalType: 'decimal', precision: 10 } },
        { name: 'e', type: { type: 'fixed', name: 'U', size: 8, logicalType: 'uuid' } },
        { name: 'f', type: { type: 'long', logicalType: 'date' } },
        { name: 'g', type: { type: 'int', logicalType: 'timestamp-millis' } },
        { name: 'h', type: { type: 'fixed', name: 'Dur', size: 16, logicalType: 'duration' } },
        { name: 'i', type: 'int', logicalType: 'date' },
      ],
    },
    errors: [
      {
        message: 'Logical type "decimal" must annotate "bytes" or "fixed"; Avro implementations will ignore it.',
        path: ['fields', '0', 'type', 'logicalType'],
        severity: DiagnosticSeverity.Warning,
      },
      {
        message:
          'Logical type "decimal" requires "precision" to be a positive integer; Avro implementations will ignore it.',
        path: ['fields', '1', 'type', 'logicalType'],
      },
      {
        message:
          'Logical type "decimal" "scale" (5) must not be greater than "precision" (4); Avro implementations will ignore it.',
        path: ['fields', '2', 'type', 'logicalType'],
      },
      {
        message:
          'Logical type "decimal" "precision" (10) exceeds the maximum of 9 for a fixed of size 4; Avro implementations will ignore it.',
        path: ['fields', '3', 'type', 'logicalType'],
      },
      {
        message:
          'Logical type "uuid" must annotate "string" or a "fixed" of size 16; Avro implementations will ignore it.',
        path: ['fields', '4', 'type', 'logicalType'],
      },
      {
        message: 'Logical type "date" must annotate "int"; Avro implementations will ignore it.',
        path: ['fields', '5', 'type', 'logicalType'],
      },
      {
        message: 'Logical type "timestamp-millis" must annotate "long"; Avro implementations will ignore it.',
        path: ['fields', '6', 'type', 'logicalType'],
      },
      {
        message: 'Logical type "duration" must annotate a "fixed" of size 12; Avro implementations will ignore it.',
        path: ['fields', '7', 'type', 'logicalType'],
      },
      {
        message:
          'Logical type "date" is set on the field rather than on its type, so it is ignored. Use "type": { "type": "int", "logicalType": "date" } instead.',
        path: ['fields', '8', 'logicalType'],
      },
    ],
  },
]);

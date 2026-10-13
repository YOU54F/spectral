import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

import { analyze } from './utils/avro';
import type { AvroObject, JsonPath } from './utils/avro';

type Check = (schema: AvroObject, type: string) => string | null;

const onType =
  (...types: string[]): Check =>
  (_schema, type) =>
    types.includes(type) ? null : `must annotate ${types.map(t => `"${t}"`).join(' or ')}`;

const onFixed =
  (size: number): Check =>
  (schema, type) =>
    type === 'fixed' && schema.size === size ? null : `must annotate a "fixed" of size ${size}`;

/** Maximum number of base-10 digits a two's-complement fixed of `size` bytes can hold. */
export const maxDecimalPrecision = (size: number): number => Math.floor(Math.log10(2 ** (8 * size - 1) - 1));

const decimal: Check = (schema, type) => {
  if (type !== 'bytes' && type !== 'fixed') return 'must annotate "bytes" or "fixed"';
  const { precision, scale } = schema;
  if (typeof precision !== 'number' || !Number.isInteger(precision) || precision < 1) {
    return 'requires "precision" to be a positive integer';
  }

  if (scale !== void 0 && (typeof scale !== 'number' || !Number.isInteger(scale) || scale < 0)) {
    return 'requires "scale" to be zero or a positive integer';
  }

  if (typeof scale === 'number' && scale > precision) {
    return `"scale" (${scale}) must not be greater than "precision" (${precision})`;
  }

  if (type === 'fixed' && typeof schema.size === 'number' && Number.isInteger(schema.size) && schema.size > 0) {
    const max = maxDecimalPrecision(schema.size);
    if (precision > max) {
      return `"precision" (${precision}) exceeds the maximum of ${max} for a fixed of size ${schema.size}`;
    }
  }

  return null;
};

const LOGICAL_TYPES: Record<string, Check> = {
  decimal,
  'big-decimal': onType('bytes'),
  uuid: (schema, type) =>
    type === 'string' || (type === 'fixed' && schema.size === 16)
      ? null
      : 'must annotate "string" or a "fixed" of size 16',
  date: onType('int'),
  'time-millis': onType('int'),
  'time-micros': onType('long'),
  'timestamp-millis': onType('long'),
  'timestamp-micros': onType('long'),
  'timestamp-nanos': onType('long'),
  'local-timestamp-millis': onType('long'),
  'local-timestamp-micros': onType('long'),
  'local-timestamp-nanos': onType('long'),
  duration: onFixed(12),
};

/**
 * Logical types must annotate the right underlying type with valid attributes.
 * Invalid logical types are ignored by Avro implementations, which silently fall back to the underlying type.
 * Unknown logical types are not reported.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroLogicalTypes(input) {
    const results: IFunctionResult[] = [];
    const analysis = analyze(input);

    const check = (schema: AvroObject, path: JsonPath): void => {
      const { logicalType, type } = schema;
      if (typeof logicalType !== 'string' || typeof type !== 'string' || !(logicalType in LOGICAL_TYPES)) return;
      const error = LOGICAL_TYPES[logicalType](schema, type);
      if (error !== null) {
        results.push({
          message: `Logical type "${logicalType}" ${error}; Avro implementations will ignore it.`,
          path: [...path, 'logicalType'],
        });
      }
    };

    for (const { schema, path } of analysis.schemas) {
      if (isPlainObject(schema)) {
        check(schema, path);
      }
    }

    for (const { field, path } of analysis.fields) {
      if (typeof field.logicalType === 'string' && typeof field.type === 'string') {
        results.push({
          message: `Logical type "${field.logicalType}" is set on the field rather than on its type, so it is ignored. Use "type": { "type": "${field.type}", "logicalType": "${field.logicalType}" } instead.`,
          path: [...path, 'logicalType'],
        });
      }
    }

    return results;
  },
);

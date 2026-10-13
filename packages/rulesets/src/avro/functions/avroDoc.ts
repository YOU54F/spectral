import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze } from './utils/avro';

const hasDoc = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

/**
 * Records should be documented with a non-empty "doc".
 */
export const avroRecordDoc = createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroRecordDoc(input) {
    const results: IFunctionResult[] = [];

    for (const { kind, schema, path, fullname } of analyze(input).named) {
      if ((kind === 'record' || kind === 'error') && !hasDoc(schema.doc)) {
        results.push({
          message: `Record "${fullname}" should have a "doc".`,
          path,
        });
      }
    }

    return results;
  },
);

/**
 * Record fields should be documented with a non-empty "doc".
 */
export const avroFieldDoc = createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroFieldDoc(input) {
    const results: IFunctionResult[] = [];

    for (const { field, path, record } of analyze(input).fields) {
      if (!hasDoc(field.doc)) {
        results.push({
          message: `Field "${String(field.name)}" of record "${record.fullname}" should have a "doc".`,
          path,
        });
      }
    }

    return results;
  },
);

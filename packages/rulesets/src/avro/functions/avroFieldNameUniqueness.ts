import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze } from './utils/avro';

/**
 * Field names must be unique within a record.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroFieldNameUniqueness(input) {
    const results: IFunctionResult[] = [];
    const seen = new Map<object, Set<string>>();

    for (const { field, path, record } of analyze(input).fields) {
      if (typeof field.name !== 'string') continue;
      let names = seen.get(record.schema);
      if (names === void 0) {
        names = new Set();
        seen.set(record.schema, names);
      }

      if (names.has(field.name)) {
        results.push({
          message: `Field "${field.name}" is already defined in record "${record.fullname}".`,
          path: [...path, 'name'],
        });
      }

      names.add(field.name);
    }

    return results;
  },
);

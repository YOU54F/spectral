import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze } from './utils/avro';

/**
 * Full names of named types (record, enum, fixed) must be unique within a schema.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroNameUniqueness(input) {
    const results: IFunctionResult[] = [];
    const { named, definitions } = analyze(input);

    for (const definition of named) {
      const first = definitions.get(definition.fullname);
      if (first !== void 0 && first !== definition) {
        results.push({
          message: `Named type "${definition.fullname}" is already defined at "${first.path.join('.') || '#'}". Full names must be unique.`,
          path: [...definition.path, 'name'],
        });
      }
    }

    return results;
  },
);

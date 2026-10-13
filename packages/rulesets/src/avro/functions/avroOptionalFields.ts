import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze } from './utils/avro';

/**
 * Optional fields (unions containing "null") should list "null" first and declare `"default": null`,
 * so that readers can resolve data written without the field.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroOptionalFields(input) {
    const results: IFunctionResult[] = [];

    for (const { field, path } of analyze(input).fields) {
      const { type } = field;
      if (!Array.isArray(type) || !type.includes('null')) continue;
      const name = String(field.name);

      if (type[0] !== 'null') {
        results.push({
          message: `Optional field "${name}" should list "null" as the first member of its union.`,
          path: [...path, 'type', type.indexOf('null')],
        });
      } else if (!('default' in field)) {
        results.push({
          message: `Optional field "${name}" should declare "default": null.`,
          path,
        });
      } else if (field.default !== null) {
        results.push({
          message: `Optional field "${name}" should have "default": null.`,
          path: [...path, 'default'],
        });
      }
    }

    return results;
  },
);

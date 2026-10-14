import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { objectEntries } from './utils/guards';

// "The list of params MUST begin with all the required params." - OpenRPC 1.x, Method Object.
// Content descriptors are optional unless "required: true" is set.
export default createRulesetFunction<unknown[], null>(
  {
    input: {
      type: 'array',
    },
    options: null,
  },
  function openrpcParamRequiredOrder(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];
    let firstOptional: string | null = null;

    for (const [i, param] of objectEntries(targetVal)) {
      const name = typeof param.name === 'string' ? param.name : String(i);

      if (param.required !== true) {
        firstOptional ??= name;
      } else if (firstOptional !== null) {
        results.push({
          message: `Required param "${name}" must not follow optional param "${firstOptional}".`,
          path: [...ctx.path, i],
        });
      }
    }

    return results;
  },
);

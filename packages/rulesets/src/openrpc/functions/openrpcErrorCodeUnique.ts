import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { objectEntries } from './utils/guards';

export default createRulesetFunction<unknown[], null>(
  {
    input: {
      type: 'array',
    },
    options: null,
  },
  function openrpcErrorCodeUnique(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];
    const seen = new Set<number>();

    for (const [i, error] of objectEntries(targetVal)) {
      const { code } = error;
      if (typeof code !== 'number') continue;

      if (seen.has(code)) {
        results.push({
          message: `Error code "${code}" must be unique within the method.`,
          path: [...ctx.path, i, 'code'],
        });
      } else {
        seen.add(code);
      }
    }

    return results;
  },
);

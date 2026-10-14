import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { objectEntries } from './utils/guards';

type Options = {
  // what the names identify, used in the message, i.e. "method" or "param"
  kind: string;
  // where the names must be unique, used in the message, i.e. "document" or "method"
  scope: string;
};

export default createRulesetFunction<unknown[], Options>(
  {
    input: {
      type: 'array',
    },
    options: {
      type: 'object',
      properties: {
        kind: { type: 'string' },
        scope: { type: 'string' },
      },
      required: ['kind', 'scope'],
      additionalProperties: false,
    },
  },
  function openrpcUniqueNames(targetVal, { kind, scope }, ctx) {
    const results: IFunctionResult[] = [];
    const seen = new Set<string>();

    for (const [i, item] of objectEntries(targetVal)) {
      const { name } = item;
      if (typeof name !== 'string') continue;

      if (seen.has(name)) {
        results.push({
          message: `${kind[0].toUpperCase()}${kind.slice(1)} name "${name}" must be unique within the ${scope}.`,
          path: [...ctx.path, i, 'name'],
        });
      } else {
        seen.add(name);
      }
    }

    return results;
  },
);

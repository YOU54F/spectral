import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

export type Options = {
  // Only items of these kinds are compared. Items of any kind are compared when omitted.
  kinds?: string[];
  // Used in the message, e.g. `Type name "Pet" must be unique within the document.`
  label: string;
  // Used in the message, e.g. `within the document`.
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
        kinds: { type: 'array', items: { type: 'string' } },
        label: { type: 'string' },
        scope: { type: 'string' },
      },
      required: ['label', 'scope'],
      additionalProperties: false,
    },
  },
  function graphqlUniqueNames(targetVal, { kinds, label, scope }, ctx) {
    const results: IFunctionResult[] = [];
    const seen = new Set<string>();

    targetVal.forEach((item, i) => {
      if (typeof item !== 'object' || item === null) return;
      const { kind, name } = item as { kind?: unknown; name?: unknown };
      if (typeof name !== 'string') return;
      if (kinds !== void 0 && (typeof kind !== 'string' || !kinds.includes(kind))) return;

      if (seen.has(name)) {
        results.push({
          message: `${label} "${name}" must be unique ${scope}.`,
          path: [...ctx.path, i, 'name'],
        });
      } else {
        seen.add(name);
      }
    });

    return results;
  },
);

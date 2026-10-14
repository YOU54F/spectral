import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

type Scope = {
  messages?: { name: string }[];
  enums?: { name: string }[];
  services?: { name: string }[];
};

// Messages, enums and services declared directly in a scope (the file or a message) must have distinct names.
export default createRulesetFunction<Scope, null>(
  {
    input: null,
    options: null,
  },
  function protobufTypeNamesUnique(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];
    const seen = new Set<string>();

    for (const kind of ['messages', 'enums', 'services'] as const) {
      const types = targetVal[kind];
      if (!Array.isArray(types)) continue;
      types.forEach(({ name }, i) => {
        if (typeof name !== 'string') return;
        if (seen.has(name)) {
          results.push({
            message: `Type name "${name}" is already defined in this scope.`,
            path: [...ctx.path, kind, i, 'name'],
          });
        } else {
          seen.add(name);
        }
      });
    }

    return results;
  },
);

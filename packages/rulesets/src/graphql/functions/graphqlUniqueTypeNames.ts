import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

// Type definitions share one namespace. Extensions (`extend type Foo`) and directive definitions are not counted.
const TYPE_DEFINITIONS = new Set([
  'ScalarTypeDefinition',
  'ObjectTypeDefinition',
  'InterfaceTypeDefinition',
  'UnionTypeDefinition',
  'EnumTypeDefinition',
  'InputObjectTypeDefinition',
]);

export default createRulesetFunction<unknown[], null>(
  {
    input: {
      type: 'array',
    },
    options: null,
  },
  function graphqlUniqueTypeNames(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];
    const seen = new Set<string>();

    targetVal.forEach((definition, i) => {
      if (typeof definition !== 'object' || definition === null) return;
      const { kind, name } = definition as { kind?: unknown; name?: unknown };
      if (typeof kind !== 'string' || !TYPE_DEFINITIONS.has(kind) || typeof name !== 'string') return;

      if (seen.has(name)) {
        results.push({
          message: `Type name "${name}" must be unique within the document.`,
          path: [...ctx.path, i, 'name'],
        });
      } else {
        seen.add(name);
      }
    });

    return results;
  },
);

import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

const INVALID_NAME_CHARACTERS = /[<>\s$]/;

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpNamedArgument(argument, _opts, { path: basePath }) {
    if (argument.type !== 'named' || typeof argument.name !== 'string') return;

    const { name } = argument;
    const results: IFunctionResult[] = [];

    if (INVALID_NAME_CHARACTERS.test(name)) {
      results.push({
        message: `Named argument name "${name}" must not contain spaces, "<", ">" or "$".`,
        path: [...basePath, 'name'],
      });
    }

    for (const field of ['value', 'default']) {
      const value = argument[field];
      if (name.length > 0 && typeof value === 'string' && value.startsWith(name)) {
        results.push({
          message: `Named argument "${field}" must not repeat the argument name "${name}"; the name is added automatically.`,
          path: [...basePath, field],
        });
      }
    }

    return results;
  },
);

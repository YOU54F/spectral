import { createRulesetFunction } from '@stoplight/spectral-core';

// Reports a missing or empty description at the item's name, rather than across the whole item.
export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function graphqlDescription(targetVal, _opts, ctx) {
    const { description, name } = targetVal;
    if (typeof description === 'string' && description.trim().length > 0) return;

    return [
      {
        message: 'Missing description.',
        path: typeof name === 'string' ? [...ctx.path, 'name'] : [...ctx.path],
      },
    ];
  },
);

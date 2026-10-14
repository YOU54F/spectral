import { createRulesetFunction } from '@stoplight/spectral-core';

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function openrpcNonEmptyArray(targetVal, _opts, ctx) {
    if (Array.isArray(targetVal) && targetVal.length > 0) return;

    return [
      {
        message: `"${String(ctx.path[ctx.path.length - 1])}" must be a non-empty array.`,
      },
    ];
  },
);

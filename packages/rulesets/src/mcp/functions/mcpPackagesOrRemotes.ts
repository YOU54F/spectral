import { createRulesetFunction } from '@stoplight/spectral-core';

const isNonEmptyArray = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpPackagesOrRemotes(server) {
    if (isNonEmptyArray(server.packages) || isNonEmptyArray(server.remotes)) return;

    return [
      {
        message: 'Server should define at least one entry in "packages" or "remotes".',
      },
    ];
  },
);

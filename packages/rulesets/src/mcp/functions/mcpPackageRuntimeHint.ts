import { createRulesetFunction } from '@stoplight/spectral-core';

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpPackageRuntimeHint(pkg) {
    const { runtimeArguments, runtimeHint } = pkg;

    if (!Array.isArray(runtimeArguments) || runtimeArguments.length === 0) return;
    if (typeof runtimeHint === 'string' && runtimeHint.trim().length > 0) return;

    return [
      {
        message: 'Package with "runtimeArguments" should specify a "runtimeHint" (e.g. "npx", "uvx", "docker", "dnx").',
      },
    ];
  },
);

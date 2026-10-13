import { createRulesetFunction } from '@stoplight/spectral-core';

import { isVersionRange } from './utils/version';

export default createRulesetFunction<string, null>(
  {
    input: {
      type: 'string',
    },
    options: null,
  },
  function mcpVersionNotRange(version) {
    if (isVersionRange(version)) {
      return [
        {
          message: `Version "${version}" looks like a version range. Use a specific version (e.g. "1.2.3") instead.`,
        },
      ];
    }

    return;
  },
);

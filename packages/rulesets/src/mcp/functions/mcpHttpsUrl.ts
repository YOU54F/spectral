import { createRulesetFunction } from '@stoplight/spectral-core';

import { isSafeHttpsUrl } from './utils/urlTemplate';

export default createRulesetFunction<string, null>(
  {
    input: {
      type: 'string',
    },
    options: null,
  },
  function mcpHttpsUrl(url) {
    if (isSafeHttpsUrl(url)) return;

    return [
      {
        message: `"${url}" must be an absolute https URL.`,
      },
    ];
  },
);

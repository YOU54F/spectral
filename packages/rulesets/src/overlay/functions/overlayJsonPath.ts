import { createRulesetFunction } from '@stoplight/spectral-core';

import { validateJsonPath } from './utils/rfc9535';

export default createRulesetFunction<string, null>(
  {
    input: {
      type: 'string',
    },
    options: null,
  },
  function overlayJsonPath(input) {
    const error = validateJsonPath(input);
    if (error === null) return;

    return [
      {
        message: `"${input}" is not a valid RFC 9535 JSONPath expression: ${error.message} (at position ${error.position})`,
      },
    ];
  },
);

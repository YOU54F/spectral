import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

// Mirrors the MCP registry: alphanumeric start/end for both parts, exactly one slash.
const SERVER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\/[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;

export default createRulesetFunction<string, null>(
  {
    input: {
      type: 'string',
    },
    options: null,
  },
  function mcpServerName(name) {
    const results: IFunctionResult[] = [];

    if (name.split('/').length !== 2) {
      return [
        {
          message: 'Server name must contain exactly one "/" separating the namespace and the server name.',
        },
      ];
    }

    if (!SERVER_NAME.test(name)) {
      results.push({
        message:
          'Server name must be in "namespace/name" format, where both parts start and end with an alphanumeric character.',
      });
    } else if (!name.split('/')[0].includes('.')) {
      results.push({
        message:
          'Server name namespace should use reverse-DNS notation (e.g. "io.github.username/server" or "com.example/server").',
      });
    }

    return results;
  },
);

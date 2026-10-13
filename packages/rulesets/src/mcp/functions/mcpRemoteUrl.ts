import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { isObject } from './utils/isObject';
import { getTemplateVariables, isLocalhost, parseUrl, substituteTemplateVariables } from './utils/urlTemplate';

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpRemoteUrl(remote, _opts, { path: basePath }) {
    const { url, variables } = remote;
    if (typeof url !== 'string') return;

    const results: IFunctionResult[] = [];
    const path = [...basePath, 'url'];

    const defined = new Set(isObject(variables) ? Object.keys(variables) : []);
    for (const variable of getTemplateVariables(url)) {
      if (!defined.has(variable)) {
        results.push({
          message: `Remote URL variable "{${variable}}" must be defined in "variables".`,
          path,
        });
      }
    }

    const parsed = parseUrl(substituteTemplateVariables(url));

    if (parsed === null) {
      results.push({
        message: `Remote URL "${url}" is not a valid URL.`,
        path,
      });
    } else if (parsed.protocol !== 'https:') {
      results.push({
        message: 'Remote URL must use https.',
        path,
      });
    } else if (isLocalhost(parsed.hostname)) {
      results.push({
        message: 'Remote URL must be publicly reachable, not localhost.',
        path,
      });
    }

    return results;
  },
);

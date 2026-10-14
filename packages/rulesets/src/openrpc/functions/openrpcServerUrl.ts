import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { fullFormats } from 'ajv-formats/dist/formats';

import { isObject } from './utils/guards';
import type { ServerObject } from './utils/types';

const URI_REFERENCE = fullFormats['uri-reference'] as RegExp;
const VARIABLE = /{([^{}]+)}/g;

export default createRulesetFunction<ServerObject, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function openrpcServerUrl(server, _opts, ctx) {
    const { url } = server;
    if (typeof url !== 'string') return;

    const results: IFunctionResult[] = [];
    const variables = isObject(server.variables) ? server.variables : {};
    const used = new Set<string>();

    const substituted = url.replace(VARIABLE, (match, name: string) => {
      used.add(name);
      const variable = variables[name];
      if (!isObject(variable)) {
        results.push({
          message: `Server variable "${name}" is used in "url" but not defined in "variables".`,
          path: [...ctx.path, 'url'],
        });
        return 'x';
      }

      return typeof variable.default === 'string' ? variable.default : 'x';
    });

    for (const [name, variable] of Object.entries(variables)) {
      if (!used.has(name)) {
        results.push({
          message: `Server variable "${name}" is defined but not used in "url".`,
          path: [...ctx.path, 'variables', name],
        });
      }

      if (
        isObject(variable) &&
        Array.isArray(variable.enum) &&
        typeof variable.default === 'string' &&
        !variable.enum.includes(variable.default)
      ) {
        results.push({
          message: `Default value "${variable.default}" of server variable "${name}" must be one of its "enum" values.`,
          path: [...ctx.path, 'variables', name, 'default'],
        });
      }
    }

    if (!URI_REFERENCE.test(substituted)) {
      results.push({
        message: `Server "url" must be a valid URL (relative URLs and {variables} are allowed), got "${url}".`,
        path: [...ctx.path, 'url'],
      });
    }

    return results;
  },
);

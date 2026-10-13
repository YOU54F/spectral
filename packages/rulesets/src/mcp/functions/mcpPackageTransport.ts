import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { isObject } from './utils/isObject';
import { getTemplateVariables, parseUrl, substituteTemplateVariables } from './utils/urlTemplate';

const HTTP_TRANSPORTS = ['streamable-http', 'sse'];

function collectAvailableVariables(pkg: Record<string, unknown>): Set<string> {
  const names = new Set<string>();

  const addInputs = (inputs: unknown, keys: string[]): void => {
    if (!Array.isArray(inputs)) return;
    for (const input of inputs) {
      if (!isObject(input)) continue;
      for (const key of keys) {
        const value = input[key];
        if (typeof value === 'string' && value.length > 0) {
          names.add(value);
          names.add(value.replace(/^-+/, ''));
        }
      }
    }
  };

  addInputs(pkg.environmentVariables, ['name']);
  addInputs(pkg.packageArguments, ['name', 'valueHint']);
  addInputs(pkg.runtimeArguments, ['name', 'valueHint']);

  return names;
}

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpPackageTransport(pkg, _opts, { path: basePath }) {
    const { transport } = pkg;
    if (!isObject(transport) || typeof transport.type !== 'string') return;

    const results: IFunctionResult[] = [];
    const { type, url } = transport;

    if (type === 'stdio') {
      if (url !== void 0) {
        results.push({
          message: 'Transport of type "stdio" must not specify a "url".',
          path: [...basePath, 'transport', 'url'],
        });
      }

      return results;
    }

    if (!HTTP_TRANSPORTS.includes(type)) return results;

    if (typeof url !== 'string' || url.length === 0) {
      results.push({
        message: `Transport of type "${type}" must specify a "url".`,
        path: [...basePath, 'transport'],
      });
      return results;
    }

    const available = collectAvailableVariables(pkg);
    const undefinedVariables = getTemplateVariables(url).filter(variable => !available.has(variable));

    for (const variable of undefinedVariables) {
      results.push({
        message: `Transport URL variable "{${variable}}" must match an environment variable or argument name of the package.`,
        path: [...basePath, 'transport', 'url'],
      });
    }

    if (parseUrl(substituteTemplateVariables(url)) === null) {
      results.push({
        message: `Transport URL "${url}" is not a valid URL.`,
        path: [...basePath, 'transport', 'url'],
      });
    }

    return results;
  },
);

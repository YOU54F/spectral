import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { isObject, objectEntries } from './utils/guards';
import type { MethodObject } from './utils/types';

export default createRulesetFunction<MethodObject, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function openrpcExamplePairingParams(method, _opts, ctx) {
    if (!Array.isArray(method.examples) || !Array.isArray(method.params)) return;

    const results: IFunctionResult[] = [];
    const methodName = typeof method.name === 'string' ? method.name : String(ctx.path[ctx.path.length - 1]);

    const paramNames = new Set<string>();
    const requiredNames: string[] = [];
    for (const [, param] of objectEntries(method.params)) {
      if (typeof param.name !== 'string') continue;
      paramNames.add(param.name);
      if (param.required === true) requiredNames.push(param.name);
    }

    for (const [i, pairing] of objectEntries(method.examples)) {
      const pairingPath = [...ctx.path, 'examples', i];
      const pairingName = typeof pairing.name === 'string' ? pairing.name : String(i);

      if (Array.isArray(pairing.params)) {
        const exampleNames = new Set<string>();

        for (const [j, example] of objectEntries(pairing.params)) {
          if (typeof example.name !== 'string') continue;
          exampleNames.add(example.name);

          if (!paramNames.has(example.name)) {
            results.push({
              message: `Example param "${example.name}" of pairing "${pairingName}" is not a param of method "${methodName}".`,
              path: [...pairingPath, 'params', j, 'name'],
            });
          }
        }

        for (const name of requiredNames) {
          if (!exampleNames.has(name)) {
            results.push({
              message: `Example pairing "${pairingName}" is missing required param "${name}".`,
              path: [...pairingPath, 'params'],
            });
          }
        }
      }

      if (isObject(pairing.result) && method.result === void 0) {
        results.push({
          message: `Example pairing "${pairingName}" has a result, but method "${methodName}" has no result (it is a notification).`,
          path: [...pairingPath, 'result'],
        });
      }
    }

    return results;
  },
);

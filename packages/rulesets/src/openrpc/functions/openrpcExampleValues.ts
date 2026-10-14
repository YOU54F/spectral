import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult, RulesetFunctionContext } from '@stoplight/spectral-core';
import { schema as schemaFn } from '@stoplight/spectral-functions';
import type { JsonPath } from '@stoplight/types';

import { isObject, objectEntries } from './utils/guards';
import type { MethodObject } from './utils/types';

function validate(
  example: Record<string, unknown>,
  contentDescriptor: unknown,
  path: JsonPath,
  ctx: RulesetFunctionContext,
): IFunctionResult[] {
  if (!('value' in example) || !isObject(contentDescriptor) || !isObject(contentDescriptor.schema)) return [];

  const results = schemaFn(
    example.value,
    {
      allErrors: true,
      schema: contentDescriptor.schema,
    },
    {
      ...ctx,
      path: [...path, 'value'],
    },
  );

  return Array.isArray(results) ? results : [];
}

export default createRulesetFunction<MethodObject, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function openrpcExampleValues(method, _opts, ctx) {
    if (!Array.isArray(method.examples)) return;

    const results: IFunctionResult[] = [];

    const params = new Map<string, Record<string, unknown>>();
    for (const [, param] of objectEntries(method.params)) {
      if (typeof param.name === 'string') params.set(param.name, param);
    }

    for (const [i, pairing] of objectEntries(method.examples)) {
      const pairingPath = [...ctx.path, 'examples', i];

      for (const [j, example] of objectEntries(pairing.params)) {
        if (typeof example.name !== 'string') continue;
        results.push(...validate(example, params.get(example.name), [...pairingPath, 'params', j], ctx));
      }

      if (isObject(pairing.result)) {
        results.push(...validate(pairing.result, method.result, [...pairingPath, 'result'], ctx));
      }
    }

    return results;
  },
);

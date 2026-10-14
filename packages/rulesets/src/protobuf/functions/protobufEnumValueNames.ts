import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { ProtobufEnum } from '@stoplight/spectral-parsers';

import { toUpperSnakeCase } from './utils';

const UPPER_SNAKE_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

export default createRulesetFunction<ProtobufEnum, null>(
  {
    input: null,
    options: null,
  },
  function protobufEnumValueNames(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];
    if (!Array.isArray(targetVal.values)) return results;
    const prefix = `${toUpperSnakeCase(targetVal.name)}_`;

    targetVal.values.forEach(({ name }, i) => {
      const path = [...ctx.path, 'values', i, 'name'];
      if (!UPPER_SNAKE_CASE.test(name)) {
        results.push({ message: `Enum value "${name}" must be UPPER_SNAKE_CASE.`, path });
      } else if (!name.startsWith(prefix)) {
        results.push({ message: `Enum value "${name}" must be prefixed with "${prefix}".`, path });
      }
    });

    return results;
  },
);

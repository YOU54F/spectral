import { createRulesetFunction } from '@stoplight/spectral-core';
import type { ProtobufEnum } from '@stoplight/spectral-parsers';

export default createRulesetFunction<ProtobufEnum, null>(
  {
    input: null,
    options: null,
  },
  function protobufEnumZeroValue(targetVal, _opts, ctx) {
    if (!Array.isArray(targetVal.values)) return;
    const index = targetVal.values.findIndex(({ number }) => number === 0);
    if (index === -1) return;
    const { name } = targetVal.values[index];
    if (name.endsWith('_UNSPECIFIED')) return;

    return [
      {
        message: `Enum zero value "${name}" must be suffixed with "_UNSPECIFIED".`,
        path: [...ctx.path, 'values', index, 'name'],
      },
    ];
  },
);

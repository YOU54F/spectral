import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { ProtobufEnum } from '@stoplight/spectral-parsers';
import { inReservedRange } from './utils';

export type Options = {
  // "number": value numbers must be unique (unless allow_alias is set) and not reserved;
  // "name": value names must be unique and not reserved
  property: 'number' | 'name';
};

export default createRulesetFunction<ProtobufEnum, Options>(
  {
    input: null,
    options: {
      type: 'object',
      additionalProperties: false,
      properties: {
        property: { enum: ['number', 'name'] },
      },
      required: ['property'],
    },
  },
  function protobufEnumValuesUnique(targetVal, { property }, ctx) {
    if (!Array.isArray(targetVal.values)) return;
    const results: IFunctionResult[] = [];
    const seen = new Map<string | number, string>();
    const reserved = targetVal.reserved ?? { ranges: [], names: [] };
    const allowAlias = property === 'number' && targetVal.options?.allow_alias === true;

    targetVal.values.forEach((enumValue, i) => {
      const value = enumValue[property];
      const at = [...ctx.path, 'values', i, property];

      if (
        property === 'number'
          ? inReservedRange(enumValue.number, reserved.ranges)
          : reserved.names.includes(enumValue.name)
      ) {
        results.push({
          message:
            property === 'number'
              ? `Enum value number ${value} of "${enumValue.name}" is reserved.`
              : `Enum value name "${enumValue.name}" is reserved.`,
          path: at,
        });
      }

      const other = seen.get(value);
      if (other === void 0) {
        seen.set(value, enumValue.name);
      } else if (!allowAlias) {
        results.push({
          message:
            property === 'number'
              ? `Enum value number ${value} of "${enumValue.name}" is already used by "${other}"; set "option allow_alias = true;" to allow aliases.`
              : `Enum value name "${enumValue.name}" is already used in enum "${targetVal.name}".`,
          path: at,
        });
      }
    });

    return results;
  },
);

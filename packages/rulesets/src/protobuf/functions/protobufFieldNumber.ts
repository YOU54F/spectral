import { createRulesetFunction } from '@stoplight/spectral-core';

const MAX_FIELD_NUMBER = 536870911;

export default createRulesetFunction<number, null>(
  {
    input: {
      type: 'number',
    },
    options: null,
  },
  function protobufFieldNumber(targetVal) {
    if (targetVal >= 19000 && targetVal <= 19999) {
      return [{ message: `Field number ${targetVal} is in the 19000-19999 range reserved by Protobuf.` }];
    }

    if (!Number.isInteger(targetVal) || targetVal < 1 || targetVal > MAX_FIELD_NUMBER) {
      return [{ message: `Field number ${targetVal} must be between 1 and ${MAX_FIELD_NUMBER}.` }];
    }

    return;
  },
);

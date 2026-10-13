import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze, describeType, isValidDefault } from './utils/avro';

/**
 * Field defaults must be valid for the field's type. For unions, the default must match one of the members (Avro 1.12).
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroFieldDefaults(input) {
    const results: IFunctionResult[] = [];
    const analysis = analyze(input);

    for (const { field, path, record } of analysis.fields) {
      if (!('default' in field) || !('type' in field)) continue;

      if (!isValidDefault(field.default, field.type, record.namespace, analysis)) {
        results.push({
          message: `Default value of field "${String(field.name)}" does not match its type (${describeType(field.type)}).`,
          path: [...path, 'default'],
        });
      }
    }

    return results;
  },
);

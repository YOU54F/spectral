import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze, describeType, matchingUnionBranch } from './utils/avro';

/**
 * Before Avro 1.12 the default of a union field had to match the first member of the union, and many
 * implementations still enforce that. Defaults matching no member are reported by avro-field-default-valid,
 * and `null` defaults of optional fields are covered by avro-optional-field-null-default.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroUnionDefaults(input) {
    const results: IFunctionResult[] = [];
    const analysis = analyze(input);

    for (const { field, path, record } of analysis.fields) {
      if (!('default' in field) || !Array.isArray(field.type) || field.type.length === 0) continue;
      if (field.default === null && field.type.includes('null')) continue;

      const branch = matchingUnionBranch(field.default, field.type, record.namespace, analysis);
      if (branch > 0) {
        results.push({
          message: `Default value of field "${String(field.name)}" matches union member ${branch} (${describeType(
            field.type[branch],
          )}), not the first member (${describeType(field.type[0])}). Older Avro implementations reject this.`,
          path: [...path, 'default'],
        });
      }
    }

    return results;
  },
);

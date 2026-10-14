import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze } from './utils/avro';

/**
 * References to named types must resolve to a named type defined earlier in the schema.
 * Unqualified names are resolved against the enclosing namespace (falling back to the null namespace).
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroTypeReferences(input) {
    const results: IFunctionResult[] = [];
    const { references } = analyze(input);

    for (const { name, namespace, path, resolved, definedBefore } of references) {
      if (resolved === null) {
        const where =
          name.includes('.') || namespace === '' ? '' : ` (looked up as "${namespace}.${name}" and "${name}")`;
        results.push({
          message: `Type "${name}" is not defined${where}.`,
          path,
        });
      } else if (!definedBefore) {
        results.push({
          message: `Type "${name}" is referenced before it is defined. Avro requires named types to be defined before use.`,
          path,
        });
      }
    }

    return results;
  },
);

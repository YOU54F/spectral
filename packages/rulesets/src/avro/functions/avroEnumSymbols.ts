import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze, isValidName } from './utils/avro';

/**
 * Enum symbols must be valid Avro names and unique; the enum default must be one of the symbols.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroEnumSymbols(input) {
    const results: IFunctionResult[] = [];

    for (const { kind, schema, path, fullname } of analyze(input).named) {
      if (kind !== 'enum' || !Array.isArray(schema.symbols)) continue;
      const symbols = new Set<string>();

      schema.symbols.forEach((symbol, i) => {
        if (typeof symbol !== 'string') return;
        if (!isValidName(symbol)) {
          results.push({
            message: `Enum symbol "${symbol}" is not a valid Avro name. It must match [A-Za-z_][A-Za-z0-9_]*.`,
            path: [...path, 'symbols', i],
          });
        }

        if (symbols.has(symbol)) {
          results.push({
            message: `Enum symbol "${symbol}" is duplicated in enum "${fullname}".`,
            path: [...path, 'symbols', i],
          });
        }

        symbols.add(symbol);
      });

      if (typeof schema.default === 'string' && !symbols.has(schema.default)) {
        results.push({
          message: `Default "${schema.default}" of enum "${fullname}" is not one of its symbols.`,
          path: [...path, 'default'],
        });
      }
    }

    return results;
  },
);

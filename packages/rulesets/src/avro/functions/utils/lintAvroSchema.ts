import type { IFunctionResult, RulesetFunctionContext } from '@stoplight/spectral-core';

import avroSchema from '../avroSchema';
import avroNames from '../avroNames';
import avroNameUniqueness from '../avroNameUniqueness';
import avroTypeReferences from '../avroTypeReferences';
import avroFieldNameUniqueness from '../avroFieldNameUniqueness';
import avroFieldDefaults from '../avroFieldDefaults';
import avroEnumSymbols from '../avroEnumSymbols';
import avroUnions from '../avroUnions';
import avroLogicalTypes from '../avroLogicalTypes';

/**
 * Checks applied to Avro schemas embedded in other documents (e.g. AsyncAPI message payloads):
 * the structural schema plus the semantic checks for names, references, defaults, unions and logical types.
 */
const CHECKS = [
  avroSchema,
  avroNames,
  avroNameUniqueness,
  avroTypeReferences,
  avroFieldNameUniqueness,
  avroFieldDefaults,
  avroEnumSymbols,
  avroUnions,
];

const LOGICAL_TYPE_CHECKS = [avroLogicalTypes];

/**
 * Lints an Avro schema rooted at `schema`. Result paths are prefixed with `basePath`, the location of the schema root.
 */
export function lintAvroSchema(
  schema: unknown,
  basePath: IFunctionResult['path'],
  context: RulesetFunctionContext,
  checks: 'structure' | 'logicalTypes' | 'all' = 'all',
): IFunctionResult[] {
  const prefix = basePath ?? [];
  const results: IFunctionResult[] = [];

  const selected =
    checks === 'structure' ? CHECKS : checks === 'logicalTypes' ? LOGICAL_TYPE_CHECKS : [...CHECKS, ...LOGICAL_TYPE_CHECKS];

  for (const check of selected) {
    const checkResults = check(schema, null, context);
    if (!Array.isArray(checkResults)) continue;

    for (const result of checkResults) {
      results.push({ ...result, path: [...prefix, ...(result.path ?? [])] });
    }
  }

  return results;
}

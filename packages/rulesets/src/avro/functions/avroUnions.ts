import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

import { analyze, getFullname, NAMED_TYPES, PRIMITIVE_TYPES } from './utils/avro';
import type { AvroAnalysis } from './utils/avro';

/**
 * Unions may not contain more than one schema with the same type (named types are distinguished by full name)
 * and may not immediately contain other unions.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroUnions(input) {
    const results: IFunctionResult[] = [];
    const analysis = analyze(input);

    for (const { schema, path, namespace } of analysis.schemas) {
      if (!Array.isArray(schema)) continue;
      const seen = new Set<string>();

      schema.forEach((member, i) => {
        if (Array.isArray(member)) {
          results.push({
            message: 'Unions may not immediately contain other unions.',
            path: [...path, i],
          });
          return;
        }

        const key = unionKey(member, namespace, analysis);
        if (key === null) return;

        if (seen.has(key)) {
          results.push({
            message: `Union contains more than one "${key}" schema.`,
            path: [...path, i],
          });
        }

        seen.add(key);
      });
    }

    return results;
  },
);

function unionKey(member: unknown, namespace: string, analysis: AvroAnalysis): string | null {
  if (typeof member === 'string') {
    if (PRIMITIVE_TYPES.has(member)) return member;
    return analysis.resolve(member, namespace)?.fullname ?? null;
  }

  if (!isPlainObject(member) || typeof member.type !== 'string') return null;
  const { type } = member;

  if (NAMED_TYPES.has(type)) {
    return typeof member.name === 'string' ? getFullname(member.name, member.namespace, namespace)[0] : null;
  }

  if (PRIMITIVE_TYPES.has(type) || type === 'array' || type === 'map') return type;

  return analysis.resolve(type, namespace)?.fullname ?? null;
}

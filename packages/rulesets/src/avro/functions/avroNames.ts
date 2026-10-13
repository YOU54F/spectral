import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { analyze, isValidFullname, isValidName, isValidNamespace, PRIMITIVE_TYPES } from './utils/avro';

/**
 * Names of named types, namespaces, field names and aliases must follow the Avro name grammar:
 * `[A-Za-z_][A-Za-z0-9_]*`, with namespaces/full names being dot-separated sequences of such names.
 */
export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function avroNames(input) {
    const results: IFunctionResult[] = [];
    const { named, fields } = analyze(input);

    for (const { schema, path, kind } of named) {
      const { name, namespace, aliases } = schema;

      if (typeof name === 'string') {
        if (!isValidFullname(name)) {
          results.push({
            message: `Name "${name}" of ${kind} is not a valid Avro name. Each part must match [A-Za-z_][A-Za-z0-9_]*.`,
            path: [...path, 'name'],
          });
        } else if (PRIMITIVE_TYPES.has(name.slice(name.lastIndexOf('.') + 1))) {
          results.push({
            message: `Name "${name}" of ${kind} must not redefine the primitive type "${name.slice(name.lastIndexOf('.') + 1)}".`,
            path: [...path, 'name'],
          });
        }
      }

      if (typeof namespace === 'string' && !isValidNamespace(namespace)) {
        results.push({
          message: `Namespace "${namespace}" is not valid. It must be empty or a dot-separated sequence of names.`,
          path: [...path, 'namespace'],
        });
      }

      if (Array.isArray(aliases)) {
        aliases.forEach((alias, i) => {
          if (typeof alias === 'string' && !isValidFullname(alias)) {
            results.push({
              message: `Alias "${alias}" is not a valid Avro name.`,
              path: [...path, 'aliases', i],
            });
          }
        });
      }
    }

    for (const { field, path } of fields) {
      if (typeof field.name === 'string' && !isValidName(field.name)) {
        results.push({
          message: `Field name "${field.name}" is not a valid Avro name. It must match [A-Za-z_][A-Za-z0-9_]*.`,
          path: [...path, 'name'],
        });
      }

      if (Array.isArray(field.aliases)) {
        field.aliases.forEach((alias, i) => {
          if (typeof alias === 'string' && !isValidName(alias)) {
            results.push({
              message: `Field alias "${alias}" is not a valid Avro name.`,
              path: [...path, 'aliases', i],
            });
          }
        });
      }
    }

    return results;
  },
);

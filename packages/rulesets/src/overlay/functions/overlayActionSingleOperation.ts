import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { overlay1_0 } from '@stoplight/spectral-formats';

/**
 * An action should perform exactly one operation.
 *
 * - Overlay 1.0: `update` has no effect if `remove` is `true`.
 * - Overlay 1.1+: `update` has no effect if `remove` is `true` or `copy` is set,
 *   and `copy` has no effect if `remove` is `true` or `update` is set.
 *
 * Reusable action references (Overlay 1.2 `$ref` actions) are skipped, since their operation comes from the
 * referenced reusable action.
 */
export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function overlayActionSingleOperation(input, _opts, context) {
    if ('$ref' in input) return;

    const supportsCopy = !(context.document.formats?.has(overlay1_0) ?? false);

    const operations: string[] = [];
    if ('update' in input) operations.push('update');
    if (supportsCopy && 'copy' in input) operations.push('copy');
    if (input.remove === true) operations.push('remove');

    const allowed = supportsCopy ? '"update", "copy" or "remove: true"' : '"update" or "remove: true"';

    if (operations.length === 0) {
      return [
        {
          message: `Action does not perform any operation, it must have one of ${allowed}`,
          path: [...context.path],
        },
      ];
    }

    if (operations.length === 1) return;

    const effective = operations.includes('remove') ? 'remove' : 'update';
    const ignored = operations.filter(operation => operation !== effective);

    return ignored.map<IFunctionResult>(operation => ({
      message: `Action must have exactly one of ${allowed}: "${operation}" has no effect when "${effective}" is also used`,
      path: [...context.path, operation],
    }));
  },
);

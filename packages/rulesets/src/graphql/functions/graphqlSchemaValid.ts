import { createRulesetFunction } from '@stoplight/spectral-core';
import { validateGraphqlSchema } from './utils/validateGraphqlSchema';
import type { ValidateGraphqlSchemaOptions } from './utils/validateGraphqlSchema';

export type Options = ValidateGraphqlSchemaOptions | null;

export default createRulesetFunction<unknown, Options>(
  {
    input: null,
    options: {
      type: ['object', 'null'],
      properties: {
        federation: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  function graphqlSchemaValid(targetVal, opts, ctx) {
    const options = opts ?? {};
    // The parser keeps the graphql-js AST on the parsed data; fall back to the given value.
    const errors = validateGraphqlSchema(ctx.document.data, options) ?? validateGraphqlSchema(targetVal, options);
    return errors?.map(({ message, path }) => ({ message, path: [...ctx.path, ...path] }));
  },
);

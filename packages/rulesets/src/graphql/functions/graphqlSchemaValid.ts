import { createRulesetFunction } from '@stoplight/spectral-core';
import { validateGraphqlSchema } from './utils/validateGraphqlSchema';

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function graphqlSchemaValid(targetVal, _opts, ctx) {
    // The parser keeps the graphql-js AST on the parsed data; fall back to the given value.
    const errors = validateGraphqlSchema(ctx.document.data) ?? validateGraphqlSchema(targetVal);
    return errors?.map(({ message, path }) => ({ message, path: [...ctx.path, ...path] }));
  },
);

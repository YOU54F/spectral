import { Graphql } from '@stoplight/spectral-parsers/graphql';
import { validateGraphqlSchema } from '../utils/validateGraphqlSchema';

describe('validateGraphqlSchema', () => {
  it('returns no errors for a valid schema', () => {
    expect(validateGraphqlSchema(Graphql.parse('type Query { status: Status }\nenum Status { SOLD }').data)).toEqual(
      [],
    );
  });

  it('maps errors to JSON paths', () => {
    const { data } = Graphql.parse(
      'type Query { pet: Unicorn }\ninterface Node { id: ID! }\ntype Pet implements Node { a: Int }',
    );
    expect(validateGraphqlSchema(data)).toEqual([
      { message: 'Unknown type "Unicorn".', path: ['definitions', 0, 'fields', 0, 'type'] },
    ]);
  });

  it('reports schema errors once the SDL is valid', () => {
    const { data } = Graphql.parse('interface Node { id: ID! }\ntype Pet implements Node { a: Int }');
    expect(validateGraphqlSchema(data)).toEqual([
      {
        message: 'Interface field Node.id expected but Pet does not provide it.',
        path: ['definitions', 0, 'fields', 0],
      },
    ]);
  });

  it('returns undefined for data the parser did not produce', () => {
    expect(validateGraphqlSchema({ kind: 'Document', definitions: [] })).toBeUndefined();
    expect(validateGraphqlSchema(void 0)).toBeUndefined();
  });
});

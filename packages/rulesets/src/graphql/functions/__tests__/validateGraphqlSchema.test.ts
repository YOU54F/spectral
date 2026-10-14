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

  it('treats built-in scalars as known in operations', () => {
    const { data } = Graphql.parse(
      'query Q($a: String!, $b: Int, $c: Float, $d: Boolean, $e: [ID!]) { pet(id: $e) @include(if: $d) { id } }',
    );
    expect(validateGraphqlSchema(data)).toEqual([]);
  });

  it('does not report unknown types in operations-only documents', () => {
    const { data } = Graphql.parse(
      'query Q($filter: PetFilter) { pets(filter: $filter) { ...F } }\nfragment F on Pet { id }',
    );
    expect(validateGraphqlSchema(data)).toEqual([]);
  });

  it('reports unknown types in operations of documents with type definitions', () => {
    const { data } = Graphql.parse('type Pet { id: ID! }\nquery Q($id: ID!, $filter: PetFilter) { pet { id } }');
    expect(validateGraphqlSchema(data)).toEqual([
      { message: 'Unknown type "PetFilter".', path: ['definitions', 1, 'variableDefinitions', 1, 'type'] },
    ]);
  });

  it('returns undefined for data the parser did not produce', () => {
    expect(validateGraphqlSchema({ kind: 'Document', definitions: [] })).toBeUndefined();
    expect(validateGraphqlSchema(void 0)).toBeUndefined();
  });

  describe('Apollo Federation', () => {
    const validate = (sdl: string, federation?: boolean) =>
      validateGraphqlSchema(Graphql.parse(sdl).data, { federation });

    it('accepts Federation 2 directives imported by @link', () => {
      expect(
        validate(`extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external", "FieldSet"])
type Query { products: [Product] @shareable }
type Product @key(fields: "id") { id: ID! name: String @external }
scalar Extra @specifiedBy(url: "https://example.com")
type Review { by: FieldSet }`),
      ).toEqual([]);
    });

    it('accepts namespaced, renamed and link directives in Federation 2', () => {
      expect(
        validate(`schema
  @link(url: "https://specs.apollo.dev/federation/v2.9", as: "fed", import: [{ name: "@key", as: "@primaryKey" }])
  @link(url: "https://specs.apollo.dev/link/v1.0", for: EXECUTION)
  @fed__composeDirective(name: "@custom") { query: Query }
directive @custom on OBJECT
type Query { me: User @fed__requiresScopes(scopes: [["read"]]) }
type User @primaryKey(fields: "id") @fed__interfaceObject @custom { id: ID! secret: String @fed__inaccessible }`),
      ).toEqual([]);
    });

    it('reports federation directives that Federation 2 subgraphs do not import', () => {
      expect(
        validate(`extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])
type Product @key(fields: "id") @shareable @unknown { id: ID! }`),
      ).toEqual([
        { message: 'Unknown directive "@shareable".', path: ['definitions', 1, 'directives', 1] },
        { message: 'Unknown directive "@unknown".', path: ['definitions', 1, 'directives', 2] },
      ]);
    });

    it('accepts Federation 1 subgraphs, including extensions of types defined elsewhere', () => {
      expect(
        validate(`extend type Query { me: User reviews(input: _Any): [Review] }
type Review @key(fields: "id") { id: ID! author: User @provides(fields: "username") }
extend type User @key(fields: "id") { id: ID! @external username: String @external reviews: [Review] @requires(fields: "id") }
extend type User { karma: Int }`),
      ).toEqual([]);
    });

    it('maps errors in substituted extensions to the document', () => {
      expect(validate('extend type Product @key(fields: "upc") { upc: String! @external price: Money }')).toEqual([
        { message: 'Unknown type "Money".', path: ['definitions', 0, 'fields', 1, 'type'] },
      ]);
      expect(validate('extend type Product @key(fields: "upc") @external { upc: String! }')).toEqual([
        { message: 'Directive "@external" may not be used on OBJECT.', path: ['definitions', 0, 'directives', 1] },
      ]);
    });

    it('prefers definitions in the document', () => {
      expect(
        validate('directive @key(fields: String!) on OBJECT\ntype Product @key(fields: "upc") { upc: String! }'),
      ).toEqual([]);
    });

    it('can be turned off', () => {
      expect(validate('type Product @key(fields: "upc") { upc: String! }', false)).toEqual([
        { message: 'Unknown directive "@key".', path: ['definitions', 0, 'directives', 0] },
      ]);
    });
  });
});

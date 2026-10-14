import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-schema-valid', [
  {
    name: 'a valid schema, including one without a Query type',
    document:
      'interface Node { id: ID! }\ntype Pet implements Node { id: ID! kind: Kind }\nenum Kind { DOG }\nextend type Pet { name: String }',
    errors: [],
  },
  {
    name: 'unknown types',
    document: 'type Query {\n  pet: Unicorn\n}',
    errors: [
      {
        message: 'Unknown type "Unicorn".',
        path: ['definitions', '0', 'fields', '0', 'type'],
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 1, character: 7 }, end: { line: 1, character: 14 } },
      },
    ],
  },
  {
    name: 'unknown directives and extensions of undefined types',
    document: 'type Pet @cached(ttl: 60) { id: ID }\nextend type Owner { id: ID }',
    errors: [
      { message: 'Unknown directive "@cached".', path: ['definitions', '0', 'directives', '0'] },
      {
        message: 'Cannot extend type "Owner" because it is not defined.',
        path: ['definitions', '1', 'name'],
      },
    ],
  },
  {
    name: 'an Apollo Federation 2 subgraph',
    document: [
      'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable"])',
      'type Query { products: [Product] @shareable }',
      'type Product @key(fields: "id") { id: ID! price: Int @federation__requires(fields: "id") }',
      'extend type Review @key(fields: "id") { id: ID! @tag(name: "public") }',
    ].join('\n'),
    errors: [{ message: 'Unknown directive "@tag".', path: ['definitions', '3', 'fields', '0', 'directives', '0'] }],
  },
  {
    name: 'an Apollo Federation 1 subgraph',
    document:
      'extend type Query { me: User }\ntype User @key(fields: "id") @extends { id: ID! @external name: String @requires(fields: "id") }',
    errors: [],
  },
  {
    name: 'interface conformance',
    document: 'interface Node { id: ID! }\ntype Pet implements Node { name: String }',
    errors: [
      {
        message: 'Interface field Node.id expected but Pet does not provide it.',
        path: ['definitions', '0', 'fields', '0'],
      },
    ],
  },
  {
    name: 'output types used as input',
    document: 'type Pet { id: ID }\ntype Query { pets(filter: Pet): [Pet] }',
    errors: [
      {
        message: 'The type of Query.pets(filter:) must be Input Type but got: Pet.',
        path: ['definitions', '1', 'fields', '0', 'arguments', '0', 'type'],
      },
    ],
  },
  {
    name: 'an operations-only document using built-in scalars and directives',
    document: [
      'query FindPets($species: String!, $first: Int, $min: Float, $all: Boolean = false, $id: ID) {',
      '  pets(species: $species, first: $first) @include(if: $all) { ...PetFields }',
      '}',
      'mutation AdoptPet($input: AdoptPetInput!) { adoptPet(input: $input) { id @skip(if: true) } }',
      'fragment PetFields on Pet { id name }',
    ].join('\n'),
    errors: [],
  },
  {
    name: 'operations in a document with type definitions',
    document:
      'type Pet { id: ID! }\nquery Q($id: ID!, $filter: PetFilter) { pet(id: $id) { ...F } }\nfragment F on Pet { id }',
    errors: [{ message: 'Unknown type "PetFilter".', path: ['definitions', '1', 'variableDefinitions', '1', 'type'] }],
  },
  {
    name: 'unknown directives in operations',
    document: 'query Q($id: ID!) { pet(id: $id) @cached { id } }',
    errors: [
      {
        message: 'Unknown directive "@cached".',
        path: ['definitions', '0', 'selectionSet', 'selections', '0', 'directives', '0'],
      },
    ],
  },
  {
    name: 'duplicate names are left to the uniqueness rules',
    document: 'type Pet { id: ID id: ID }\ntype Pet { id: ID }\nenum Kind { DOG DOG }',
    errors: [],
  },
]);

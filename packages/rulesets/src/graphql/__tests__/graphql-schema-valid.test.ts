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
    document: 'type Pet @key(fields: "id") { id: ID }\nextend type Owner { id: ID }',
    errors: [
      { message: 'Unknown directive "@key".', path: ['definitions', '0', 'directives', '0'] },
      {
        message: 'Cannot extend type "Owner" because it is not defined.',
        path: ['definitions', '1', 'name'],
      },
    ],
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
    name: 'duplicate names are left to the uniqueness rules',
    document: 'type Pet { id: ID id: ID }\ntype Pet { id: ID }\nenum Kind { DOG DOG }',
    errors: [],
  },
]);

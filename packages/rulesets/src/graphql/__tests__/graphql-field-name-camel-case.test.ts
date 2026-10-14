import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-field-name-camel-case', [
  {
    name: 'camelCase names',
    document: 'type Query {\n  petById(petId: ID!): String\n}',
    errors: [],
  },
  {
    name: 'other names',
    document: 'type Query {\n  pet_by_id(PetId: ID!): String\n}',
    errors: [
      {
        message: 'Name "pet_by_id" should be camelCase.',
        path: ['definitions', '0', 'fields', '0', 'name'],
        severity: DiagnosticSeverity.Warning,
        range: { start: { line: 1, character: 2 }, end: { line: 1, character: 11 } },
      },
      {
        message: 'Name "PetId" should be camelCase.',
        path: ['definitions', '0', 'fields', '0', 'arguments', '0', 'name'],
      },
    ],
  },
]);

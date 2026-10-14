import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-argument-description', [
  {
    name: 'described arguments',
    document:
      'type Query {\n  pet("The id" id: ID!): String\n}\ndirective @auth("Role" role: String) on FIELD_DEFINITION',
    errors: [],
  },
  {
    name: 'undescribed arguments',
    document: 'type Query {\n  pet(id: ID!): String\n}\ndirective @auth(role: String) on FIELD_DEFINITION',
    errors: [
      {
        message: 'Field and directive arguments should have a description.',
        path: ['definitions', '0', 'fields', '0', 'arguments', '0', 'name'],
        severity: DiagnosticSeverity.Information,
        range: { start: { line: 1, character: 6 }, end: { line: 1, character: 8 } },
      },
      { path: ['definitions', '1', 'arguments', '0', 'name'] },
    ],
  },
]);

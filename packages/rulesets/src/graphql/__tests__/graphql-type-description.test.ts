import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-type-description', [
  {
    name: 'described types',
    document:
      '"A pet" type Pet { id: ID }\n"Kinds" enum Kind { DOG }\n"Any" scalar Json\nextend type Pet { name: String }',
    errors: [],
  },
  {
    name: 'undescribed types',
    document: 'type Pet { id: ID }\ninput PetInput { id: ID }\nunion Animal = Pet\ndirective @auth on FIELD_DEFINITION',
    errors: [
      {
        message: 'Types should have a description.',
        path: ['definitions', '0'],
        severity: DiagnosticSeverity.Warning,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 19 } },
      },
      { path: ['definitions', '1'] },
      { path: ['definitions', '2'] },
    ],
  },
]);

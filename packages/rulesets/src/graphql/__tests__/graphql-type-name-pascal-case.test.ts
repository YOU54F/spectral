import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-type-name-pascal-case', [
  {
    name: 'PascalCase type names',
    document: 'type PetOwner { id: ID }\nenum PetKind { DOG }\ndirective @lowerCase on FIELD',
    errors: [],
  },
  {
    name: 'other type names',
    document: 'type pet_owner { id: ID }\ninput petInput { id: ID }',
    errors: [
      {
        message: 'Type name "pet_owner" should be PascalCase.',
        path: ['definitions', '0', 'name'],
        severity: DiagnosticSeverity.Warning,
        range: { start: { line: 0, character: 5 }, end: { line: 0, character: 14 } },
      },
      { message: 'Type name "petInput" should be PascalCase.', path: ['definitions', '1', 'name'] },
    ],
  },
]);

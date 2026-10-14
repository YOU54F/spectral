import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-enum-value-unique', [
  {
    name: 'unique enum values, and the same value in different enums',
    document: 'enum Kind { DOG CAT }\nenum Size { DOG }',
    errors: [],
  },
  {
    name: 'duplicate enum values',
    document: 'enum Kind {\n  DOG\n  CAT\n  DOG\n}',
    errors: [
      {
        message: 'Enum value "DOG" must be unique within its enum.',
        path: ['definitions', '0', 'values', '2', 'name'],
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 3, character: 2 }, end: { line: 3, character: 5 } },
      },
    ],
  },
]);

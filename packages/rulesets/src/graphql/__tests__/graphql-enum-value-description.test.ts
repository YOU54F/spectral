import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-enum-value-description', [
  {
    name: 'described enum values',
    document: 'enum Kind {\n  "A dog"\n  DOG\n}',
    errors: [],
  },
  {
    name: 'undescribed enum value',
    document: 'enum Kind {\n  "A dog"\n  DOG\n  CAT\n}',
    errors: [
      {
        message: 'Enum values should have a description.',
        path: ['definitions', '0', 'values', '1'],
        severity: DiagnosticSeverity.Information,
        range: { start: { line: 3, character: 2 }, end: { line: 3, character: 5 } },
      },
    ],
  },
]);

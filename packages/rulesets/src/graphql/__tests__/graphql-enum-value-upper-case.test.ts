import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-enum-value-upper-case', [
  {
    name: 'UPPER_CASE enum values',
    document: 'enum Kind { DOG GUINEA_PIG }',
    errors: [],
  },
  {
    name: 'other enum values',
    document: 'enum Kind { DOG guineaPig }',
    errors: [
      {
        message: 'Enum value "guineaPig" should be UPPER_CASE.',
        path: ['definitions', '0', 'values', '1', 'name'],
        severity: DiagnosticSeverity.Warning,
        range: { start: { line: 0, character: 16 }, end: { line: 0, character: 25 } },
      },
    ],
  },
]);

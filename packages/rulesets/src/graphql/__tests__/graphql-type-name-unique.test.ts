import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-type-name-unique', [
  {
    name: 'unique names, extensions and same-named directives are fine',
    document: 'type Pet { id: ID }\nextend type Pet { name: String }\ndirective @Pet on FIELD',
    errors: [],
  },
  {
    name: 'duplicate type names',
    document: 'type Pet { id: ID }\nenum Kind { DOG }\ninput Pet { id: ID }',
    errors: [
      {
        message: 'Type name "Pet" must be unique within the document.',
        path: ['definitions', '2', 'name'],
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 2, character: 6 }, end: { line: 2, character: 9 } },
      },
    ],
  },
]);

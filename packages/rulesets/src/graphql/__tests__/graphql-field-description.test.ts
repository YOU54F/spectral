import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-field-description', [
  {
    name: 'described fields',
    document: 'type Pet {\n  "The id"\n  id: ID\n}\ninput PetInput {\n  """The name"""\n  name: String\n}',
    errors: [],
  },
  {
    name: 'undescribed fields and input fields',
    document: 'type Pet {\n  id: ID\n}\ninput PetInput {\n  name: String\n}\nextend type Pet {\n  age: Int\n}',
    errors: [
      {
        message: 'Fields and input fields should have a description.',
        path: ['definitions', '0', 'fields', '0'],
        severity: DiagnosticSeverity.Warning,
        range: { start: { line: 1, character: 2 }, end: { line: 1, character: 8 } },
      },
      { path: ['definitions', '1', 'fields', '0'] },
      { path: ['definitions', '2', 'fields', '0'] },
    ],
  },
]);

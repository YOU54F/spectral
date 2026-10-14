import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-field-name-unique', [
  {
    name: 'unique field names, and the same name in different types',
    document: 'type Pet { id: ID name: String }\ninterface Node { id: ID }\ninput PetInput { id: ID }',
    errors: [],
  },
  {
    name: 'duplicate field names in types, interfaces and input types',
    document:
      'type Pet {\n  id: ID\n  id: String\n}\ninterface Node { id: ID id: ID }\ninput PetInput { name: String name: String }',
    errors: [
      {
        message: 'Field name "id" must be unique within its type.',
        path: ['definitions', '0', 'fields', '1', 'name'],
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 2, character: 2 }, end: { line: 2, character: 4 } },
      },
      { path: ['definitions', '1', 'fields', '1', 'name'] },
      { path: ['definitions', '2', 'fields', '1', 'name'] },
    ],
  },
]);

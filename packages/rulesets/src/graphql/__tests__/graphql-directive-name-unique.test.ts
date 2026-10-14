import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-directive-name-unique', [
  {
    name: 'unique directive names, and a type of the same name',
    document: 'directive @auth on FIELD_DEFINITION\ndirective @cache on FIELD_DEFINITION\ntype auth { id: ID }',
    errors: [],
  },
  {
    name: 'duplicate directive names',
    document: 'directive @auth on FIELD_DEFINITION\ndirective @auth(role: String) on OBJECT',
    errors: [
      {
        message: 'Directive "auth" must be unique within the document.',
        path: ['definitions', '1', 'name'],
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 1, character: 11 }, end: { line: 1, character: 15 } },
      },
    ],
  },
]);

import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('graphql-deprecated-reason', [
  {
    name: 'deprecations with a reason',
    document:
      'type Pet {\n  name: String @deprecated(reason: "Use title")\n}\nenum Kind { CAT @deprecated(reason: "Gone") }',
    errors: [],
  },
  {
    name: 'deprecations without a reason',
    document:
      'type Pet {\n  name: String @deprecated\n  tag(old: String @deprecated(reason: "")): String\n}\nenum Kind { CAT @deprecated }',
    errors: [
      {
        message: '@deprecated should have a "reason".',
        path: ['definitions', '0', 'fields', '0', 'directives', '0', 'arguments'],
        severity: DiagnosticSeverity.Warning,
        range: { start: { line: 1, character: 15 }, end: { line: 1, character: 26 } },
      },
      { path: ['definitions', '0', 'fields', '1', 'arguments', '0', 'directives', '0', 'arguments'] },
      { path: ['definitions', '1', 'values', '0', 'directives', '0', 'arguments'] },
    ],
  },
]);

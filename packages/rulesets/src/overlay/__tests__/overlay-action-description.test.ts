import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1' };

testRule('overlay-action-description', [
  {
    name: 'actions have descriptions',
    document: { overlay: '1.0.0', info, actions: [{ target: '$', remove: true, description: 'Remove all' }] },
    errors: [],
  },
  {
    name: 'action description is missing',
    document: { overlay: '1.1.0', info, actions: [{ target: '$', remove: true }] },
    errors: [
      {
        message: 'Action should have a non-empty "description".',
        path: ['actions', '0'],
        severity: DiagnosticSeverity.Hint,
      },
    ],
  },
]);

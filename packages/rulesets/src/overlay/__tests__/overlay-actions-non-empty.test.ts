import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1' };

testRule('overlay-actions-non-empty', [
  {
    name: 'actions has items',
    document: { overlay: '1.0.0', info, actions: [{ target: '$', remove: true }] },
    errors: [],
  },
  {
    name: 'actions is empty',
    document: { overlay: '1.1.0', info, actions: [] },
    errors: [
      { message: 'Overlay must have at least one action', path: ['actions'], severity: DiagnosticSeverity.Error },
    ],
  },
]);

import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1' };

testRule('overlay-action-remove-boolean', [
  {
    name: 'remove is a boolean or absent',
    document: {
      overlay: '1.0.0',
      info,
      actions: [
        { target: '$.a', remove: true },
        { target: '$.b', remove: false, update: {} },
        { target: '$.c', update: {} },
      ],
    },
    errors: [],
  },
  {
    name: 'remove is not a boolean',
    document: {
      overlay: '1.2.0',
      info,
      actions: [
        { target: '$.a', remove: 'true' },
        { target: '$.b', $ref: '#/components/actions/r' },
      ],
      components: { actions: { r: { fields: { remove: 1 } } } },
    },
    errors: [
      { message: '"remove" must be a boolean', path: ['actions', '0', 'remove'], severity: DiagnosticSeverity.Error },
      { path: ['components', 'actions', 'r', 'fields', 'remove'], severity: DiagnosticSeverity.Error },
    ],
  },
]);

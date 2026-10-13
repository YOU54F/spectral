import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1' };

testRule('overlay-action-single-operation', [
  {
    name: 'one operation per action',
    document: {
      overlay: '1.1.0',
      info,
      actions: [
        { target: '$.info', update: { title: 'x' } },
        { target: '$.paths', copy: '$.x' },
        { target: '$.tags', remove: true },
        { target: '$.servers', update: [], remove: false },
      ],
    },
    errors: [],
  },
  {
    name: 'reusable action references are skipped',
    document: {
      overlay: '1.2.0',
      info,
      actions: [{ target: '$.tags', $ref: '#/components/actions/remove' }],
      components: { actions: { remove: { fields: { remove: true } } } },
    },
    errors: [],
  },
  {
    name: 'no operation',
    document: {
      overlay: '1.0.0',
      info,
      actions: [{ target: '$.info' }, { target: '$.info', remove: false }],
    },
    errors: [
      {
        message: 'Action does not perform any operation, it must have one of "update" or "remove: true"',
        path: ['actions', '0'],
        severity: DiagnosticSeverity.Warning,
      },
      { path: ['actions', '1'], severity: DiagnosticSeverity.Warning },
    ],
  },
  {
    name: 'update and remove in Overlay 1.0',
    document: {
      overlay: '1.0.0',
      info,
      actions: [{ target: '$.info', update: {}, remove: true }],
    },
    errors: [
      {
        message:
          'Action must have exactly one of "update" or "remove: true": "update" has no effect when "remove" is also used',
        path: ['actions', '0', 'update'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'update and copy in Overlay 1.1',
    document: {
      overlay: '1.1.0',
      info,
      actions: [{ target: '$.info', update: {}, copy: '$.x' }],
    },
    errors: [
      {
        message:
          'Action must have exactly one of "update", "copy" or "remove: true": "copy" has no effect when "update" is also used',
        path: ['actions', '0', 'copy'],
      },
    ],
  },
  {
    name: 'copy and remove in Overlay 1.2',
    document: {
      overlay: '1.2.0',
      info,
      actions: [{ target: '$.info', copy: '$.x', remove: true }],
    },
    errors: [
      {
        message:
          'Action must have exactly one of "update", "copy" or "remove: true": "copy" has no effect when "remove" is also used',
        path: ['actions', '0', 'copy'],
      },
    ],
  },
]);

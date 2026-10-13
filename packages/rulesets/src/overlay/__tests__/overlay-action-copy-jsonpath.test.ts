import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1' };

testRule('overlay-action-copy-jsonpath', [
  {
    name: 'valid copy',
    document: {
      overlay: '1.1.0',
      info,
      actions: [{ target: '$.paths', copy: "$.paths['/pets']" }],
    },
    errors: [],
  },
  {
    name: 'invalid copy',
    document: {
      overlay: '1.1.0',
      info,
      actions: [{ target: '$.paths', copy: "$.paths['/pets'" }],
    },
    errors: [
      {
        message: `"$.paths['/pets'" is not a valid RFC 9535 JSONPath expression: expected "]" but found end of input (at position 15)`,
        path: ['actions', '0', 'copy'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'invalid copy in a reusable action',
    document: {
      overlay: '1.2.0',
      info,
      actions: [{ target: '$.paths', $ref: '#/components/actions/c' }],
      components: { actions: { c: { fields: { copy: 'paths' } } } },
    },
    errors: [{ path: ['components', 'actions', 'c', 'fields', 'copy'], severity: DiagnosticSeverity.Error }],
  },
  {
    name: 'copy is ignored in Overlay 1.0',
    document: {
      overlay: '1.0.0',
      info,
      actions: [{ target: '$.paths', copy: 'paths' }],
    },
    errors: [],
  },
]);

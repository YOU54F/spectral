import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1' };

testRule('overlay-action-target-jsonpath', [
  {
    name: 'valid RFC 9535 targets',
    document: {
      overlay: '1.0.0',
      info,
      actions: [
        { target: '$', remove: true },
        { target: "$.paths['/pets'].get", remove: true },
        { target: '$.paths.*.*[?@.tags && length(@.tags) > 1]', remove: true },
        { target: "$..parameters[?@.in == 'query' && match(@.name, 'page.*')]", remove: true },
      ],
    },
    errors: [],
  },
  {
    name: 'invalid targets',
    document: {
      overlay: '1.1.0',
      info,
      actions: [
        { target: 'paths', remove: true },
        { target: '$.paths[', remove: true },
        { target: '$..[?(@.x == 1)]^', remove: true },
        { target: '$.paths[?(@property === "x")]', remove: true },
      ],
    },
    errors: [
      {
        message:
          '"paths" is not a valid RFC 9535 JSONPath expression: a JSONPath query must start with the root identifier "$" (at position 0)',
        path: ['actions', '0', 'target'],
        severity: DiagnosticSeverity.Error,
      },
      { path: ['actions', '1', 'target'], severity: DiagnosticSeverity.Error },
      { path: ['actions', '2', 'target'], severity: DiagnosticSeverity.Error },
      { path: ['actions', '3', 'target'], severity: DiagnosticSeverity.Error },
    ],
  },
]);

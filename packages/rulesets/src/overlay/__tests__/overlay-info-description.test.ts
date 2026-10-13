import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

testRule('overlay-info-description', [
  {
    name: 'description is present',
    document: { overlay: '1.1.0', info: { title: 'Overlay', version: '1', description: 'Hello' }, actions: [] },
    errors: [],
  },
  {
    name: 'Overlay 1.0 has no info description',
    document: { overlay: '1.0.0', info: { title: 'Overlay', version: '1' }, actions: [] },
    errors: [],
  },
  {
    name: 'description is missing',
    document: { overlay: '1.2.0', info: { title: 'Overlay', version: '1' }, actions: [] },
    errors: [
      {
        message: 'Info object should have a non-empty "description".',
        path: ['info'],
        severity: DiagnosticSeverity.Hint,
      },
    ],
  },
]);

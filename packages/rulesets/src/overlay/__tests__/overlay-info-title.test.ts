import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

testRule('overlay-info-title', [
  {
    name: 'title is present',
    document: { overlay: '1.0.0', info: { title: 'Overlay', version: '1' }, actions: [] },
    errors: [],
  },
  {
    name: 'title is missing',
    document: { overlay: '1.1.0', info: { version: '1' }, actions: [] },
    errors: [
      { message: 'Info object must have a non-empty "title".', path: ['info'], severity: DiagnosticSeverity.Warning },
    ],
  },
  {
    name: 'title is empty',
    document: { overlay: '1.2.0', info: { title: '', version: '1' }, actions: [] },
    errors: [{ path: ['info', 'title'], severity: DiagnosticSeverity.Warning }],
  },
]);

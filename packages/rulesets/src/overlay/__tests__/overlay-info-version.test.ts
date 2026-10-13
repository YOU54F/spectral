import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

testRule('overlay-info-version', [
  {
    name: 'version is present',
    document: { overlay: '1.0.0', info: { title: 'Overlay', version: '1.0.0' }, actions: [] },
    errors: [],
  },
  {
    name: 'version is missing',
    document: { overlay: '1.1.0', info: { title: 'Overlay' }, actions: [] },
    errors: [
      { message: 'Info object must have a non-empty "version".', path: ['info'], severity: DiagnosticSeverity.Warning },
    ],
  },
  {
    name: 'version is empty',
    document: { overlay: '1.2.0', info: { title: 'Overlay', version: '' }, actions: [] },
    errors: [{ path: ['info', 'version'], severity: DiagnosticSeverity.Warning }],
  },
]);

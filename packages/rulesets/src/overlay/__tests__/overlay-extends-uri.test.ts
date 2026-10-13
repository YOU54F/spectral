import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1' };
const actions = [{ target: '$', remove: true }];

testRule('overlay-extends-uri', [
  {
    name: 'extends is absent',
    document: { overlay: '1.0.0', info, actions },
    errors: [],
  },
  {
    name: 'extends is an absolute or relative URI reference',
    document: { overlay: '1.1.0', info, actions, extends: 'https://example.com/openapi.yaml' },
    errors: [],
  },
  {
    name: 'extends is a relative URI reference',
    document: { overlay: '1.2.0', info, actions, extends: '../openapi.yaml' },
    errors: [],
  },
  {
    name: 'extends with a fragment is allowed before Overlay 1.2',
    document: { overlay: '1.1.0', info, actions, extends: 'openapi.yaml#/info' },
    errors: [],
  },
  {
    name: 'extends is not a string',
    document: { overlay: '1.0.0', info, actions, extends: 42 },
    errors: [
      { message: '"extends" must be a URI reference string', path: ['extends'], severity: DiagnosticSeverity.Error },
    ],
  },
  {
    name: 'extends is not a valid URI reference',
    document: { overlay: '1.0.0', info, actions, extends: 'https://exa mple.com/' },
    errors: [
      {
        message: '"extends" must be a valid URI reference, "https://exa mple.com/" is not',
        path: ['extends'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'extends with a fragment in Overlay 1.2',
    document: { overlay: '1.2.0', info, actions, extends: 'openapi.yaml#/info' },
    errors: [{ message: '"extends" must not contain a fragment', path: ['extends'] }],
  },
]);

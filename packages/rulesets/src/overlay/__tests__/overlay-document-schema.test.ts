import { DiagnosticSeverity } from '@stoplight/types';

import testRule from './__helpers__/tester';

const info = { title: 'Overlay', version: '1.0.0' };

testRule('overlay-document-schema', [
  {
    name: 'valid Overlay 1.0 document',
    document: {
      overlay: '1.0.0',
      info,
      extends: 'https://example.com/openapi.yaml',
      actions: [
        { target: '$.info', update: { description: 'Updated' } },
        { target: "$.paths['/internal']", remove: true },
      ],
    },
    errors: [],
  },
  {
    name: 'valid Overlay 1.1 document using copy',
    document: {
      overlay: '1.1.0',
      info: { ...info, description: 'An overlay' },
      actions: [{ target: '$.paths', copy: "$.paths['/pets']" }],
    },
    errors: [],
  },
  {
    name: 'valid Overlay 1.2 document using reusable actions',
    document: {
      overlay: '1.2.0',
      $self: 'https://example.com/overlay.yaml',
      info,
      actions: [{ target: '$.paths.*', $ref: '#/components/actions/remove' }],
      components: { actions: { remove: { fields: { remove: true } } } },
    },
    errors: [],
  },
  {
    name: 'missing required properties',
    document: { overlay: '1.0.0' },
    errors: [
      { message: 'must have required property "info"', path: [], severity: DiagnosticSeverity.Error },
      { message: 'must have required property "actions"', path: [], severity: DiagnosticSeverity.Error },
    ],
  },
  {
    name: 'invalid action properties',
    document: {
      overlay: '1.0.0',
      info,
      actions: [{ target: 'paths', remove: 'yes', foo: true }],
    },
    errors: [
      { message: '"target" property must match pattern "^\\$"', path: ['actions', '0', 'target'] },
      { message: '"remove" property must be boolean', path: ['actions', '0', 'remove'] },
      { message: 'Property "foo" is not expected to be here', path: ['actions', '0', 'foo'] },
    ],
  },
  {
    name: 'copy is not allowed in Overlay 1.0',
    document: { overlay: '1.0.0', info, actions: [{ target: '$', copy: '$.a' }] },
    errors: [{ message: 'Property "copy" is not expected to be here', path: ['actions', '0', 'copy'] }],
  },
  {
    name: 'only reports errors of the relevant Overlay 1.2 action kind',
    document: {
      overlay: '1.2.0',
      info,
      actions: [
        { target: '$', update: {}, foo: 1 },
        { target: '$', $ref: '#/components/actions/a', remove: true },
      ],
      components: { actions: { a: { fields: { remove: true } } } },
    },
    errors: [
      { message: 'Property "foo" is not expected to be here', path: ['actions', '0', 'foo'] },
      { message: 'Property "remove" is not expected to be here', path: ['actions', '1', 'remove'] },
    ],
  },
]);

import { overlay1_0, overlay1_1, overlay1_2 } from '@stoplight/spectral-formats';
import { length, schema, truthy } from '@stoplight/spectral-functions';

import overlayActionSingleOperation from './functions/overlayActionSingleOperation';
import overlayDocumentSchema from './functions/overlayDocumentSchema';
import overlayExtendsUri from './functions/overlayExtendsUri';
import overlayJsonPath from './functions/overlayJsonPath';

// Overlay documents are linted as-is: `$ref`s found in Overlay 1.2 actions point at reusable actions,
// and `$ref`s found in `update` values are meant for the target document, so none of them should be followed.
export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/overlay-rules.md',
  formats: [overlay1_0, overlay1_1, overlay1_2],
  rules: {
    'overlay-document-schema': {
      description: 'Overlay Document must be valid against the Overlay schema.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      resolved: false,
      given: '$',
      then: {
        function: overlayDocumentSchema,
      },
    },
    'overlay-info-title': {
      description: 'Info object must have a non-empty "title".',
      severity: 'warn',
      recommended: true,
      resolved: false,
      given: '$.info',
      then: {
        field: 'title',
        function: truthy,
      },
    },
    'overlay-info-version': {
      description: 'Info object must have a non-empty "version".',
      severity: 'warn',
      recommended: true,
      resolved: false,
      given: '$.info',
      then: {
        field: 'version',
        function: truthy,
      },
    },
    'overlay-info-description': {
      description: 'Info object should have a non-empty "description".',
      severity: 'hint',
      recommended: true,
      resolved: false,
      formats: [overlay1_1, overlay1_2],
      given: '$.info',
      then: {
        field: 'description',
        function: truthy,
      },
    },
    'overlay-actions-non-empty': {
      description: 'Overlay must have at least one action.',
      message: 'Overlay must have at least one action',
      severity: 0,
      recommended: true,
      resolved: false,
      given: '$',
      then: {
        field: 'actions',
        function: length,
        functionOptions: {
          min: 1,
        },
      },
    },
    'overlay-action-target-jsonpath': {
      description: 'Action "target" must be a valid RFC 9535 JSONPath expression.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      resolved: false,
      given: '$.actions[*].target',
      then: {
        function: overlayJsonPath,
      },
    },
    'overlay-action-copy-jsonpath': {
      description: 'Action "copy" must be a valid RFC 9535 JSONPath expression.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      resolved: false,
      formats: [overlay1_1, overlay1_2],
      given: ['$.actions[*].copy', '$.components.actions[*].fields.copy'],
      then: {
        function: overlayJsonPath,
      },
    },
    'overlay-action-single-operation': {
      description: 'Action should perform exactly one of "update", "copy" (Overlay 1.1+) or "remove".',
      message: '{{error}}',
      severity: 'warn',
      recommended: true,
      resolved: false,
      given: '$.actions[*]',
      then: {
        function: overlayActionSingleOperation,
      },
    },
    'overlay-action-remove-boolean': {
      description: 'Action "remove" must be a boolean.',
      message: '"remove" must be a boolean',
      severity: 0,
      recommended: true,
      resolved: false,
      given: ['$.actions[*].remove', '$.components.actions[*].fields.remove'],
      then: {
        function: schema,
        functionOptions: {
          schema: {
            type: 'boolean',
          },
        },
      },
    },
    'overlay-extends-uri': {
      description: '"extends" must be a valid URI reference (without a fragment in Overlay 1.2).',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      resolved: false,
      given: '$',
      then: {
        field: 'extends',
        function: overlayExtendsUri,
      },
    },
    'overlay-action-description': {
      description: 'Action should have a non-empty "description".',
      severity: 'hint',
      recommended: true,
      resolved: false,
      given: '$.actions[*]',
      then: {
        field: 'description',
        function: truthy,
      },
    },
  },
};

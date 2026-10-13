import { openrpc1 } from '@stoplight/spectral-formats';
import { enumeration, or, pattern, truthy } from '@stoplight/spectral-functions';

import openrpcDocumentSchema from './functions/openrpcDocumentSchema';
import openrpcUniqueNames from './functions/openrpcUniqueNames';
import openrpcParamRequiredOrder from './functions/openrpcParamRequiredOrder';
import openrpcRefComponentType from './functions/openrpcRefComponentType';
import openrpcErrorCodeUnique from './functions/openrpcErrorCodeUnique';
import openrpcErrorCodeReserved from './functions/openrpcErrorCodeReserved';
import openrpcExamplePairingParams from './functions/openrpcExamplePairingParams';
import openrpcExampleValues from './functions/openrpcExampleValues';
import openrpcServerUrl from './functions/openrpcServerUrl';
import openrpcNonEmptyArray from './functions/openrpcNonEmptyArray';

export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/openrpc-rules.md',
  formats: [openrpc1],
  rules: {
    'openrpc-schema': {
      description: 'OpenRPC document must be valid against the OpenRPC meta-schema.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$',
      resolved: false,
      then: {
        function: openrpcDocumentSchema,
      },
    },
    'openrpc-info-title': {
      description: 'Info object must have a non-empty "title".',
      severity: 'warn',
      recommended: true,
      given: '$.info',
      then: {
        field: 'title',
        function: truthy,
      },
    },
    'openrpc-info-version': {
      description: 'Info object must have a non-empty "version".',
      severity: 'warn',
      recommended: true,
      given: '$.info',
      then: {
        field: 'version',
        function: truthy,
      },
    },
    'openrpc-info-description': {
      description: 'Info object should have a "description".',
      severity: 'warn',
      recommended: true,
      given: '$.info',
      then: {
        field: 'description',
        function: truthy,
      },
    },
    'openrpc-method-name-unique': {
      description: 'Method names must be unique within the document.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.methods',
      then: {
        function: openrpcUniqueNames,
        functionOptions: {
          kind: 'method',
          scope: 'document',
        },
      },
    },
    'openrpc-method-name-reserved': {
      description:
        'Method names beginning with "rpc." are reserved for JSON-RPC internal methods (except "rpc.discover").',
      message: 'Method name "{{value}}" must not begin with "rpc." (reserved for JSON-RPC internal methods).',
      severity: 'error',
      recommended: true,
      given: '$.methods[*].name',
      then: {
        function: pattern,
        functionOptions: {
          notMatch: '^rpc\\.(?!discover$)',
        },
      },
    },
    'openrpc-method-description': {
      description: 'Method should have a "summary" or a "description".',
      message: 'Method should have a "summary" or a "description".',
      severity: 'warn',
      recommended: true,
      given: '$.methods[*]',
      then: {
        function: or,
        functionOptions: {
          properties: ['summary', 'description'],
        },
      },
    },
    'openrpc-method-tags': {
      description: 'Method should have non-empty "tags".',
      severity: 'warn',
      recommended: true,
      given: '$.methods[*]',
      then: {
        field: 'tags',
        function: openrpcNonEmptyArray,
      },
    },
    'openrpc-method-result': {
      description:
        'Method should have a "result". A method without a result can only be used as a notification; add a result unless that is intended.',
      message: 'Method has no "result" and can only be used as a notification.',
      severity: 'warn',
      recommended: true,
      given: '$.methods[*]',
      then: {
        field: 'result',
        function: truthy,
      },
    },
    'openrpc-param-name-unique': {
      description: 'Param names must be unique within a method.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.methods[*].params',
      then: {
        function: openrpcUniqueNames,
        functionOptions: {
          kind: 'param',
          scope: 'method',
        },
      },
    },
    'openrpc-param-required-order': {
      description: 'Required params must come before optional params.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.methods[*].params',
      then: {
        function: openrpcParamRequiredOrder,
      },
    },
    'openrpc-param-structure': {
      description: '"paramStructure" must be one of "by-position", "by-name" or "either".',
      message: '"paramStructure" must be one of "by-position", "by-name" or "either".',
      severity: 'error',
      recommended: true,
      given: '$.methods[*].paramStructure',
      then: {
        function: enumeration,
        functionOptions: {
          values: ['by-position', 'by-name', 'either'],
        },
      },
    },
    'openrpc-ref-component-type': {
      description: 'Local "$ref" must point to an entry of the matching "#/components" section.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$',
      resolved: false,
      then: {
        function: openrpcRefComponentType,
      },
    },
    'openrpc-error-code-unique': {
      description: 'Error codes must be unique within a method.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.methods[*].errors',
      then: {
        function: openrpcErrorCodeUnique,
      },
    },
    'openrpc-error-code-reserved': {
      description:
        'Error codes from -32768 to -32000 are reserved by JSON-RPC; only the pre-defined codes and the server error range (-32099 to -32000) may be used.',
      message: '{{error}}',
      severity: 'warn',
      recommended: true,
      given: ['$.methods[*].errors[*].code', '$.components.errors[*].code'],
      resolved: false,
      then: {
        function: openrpcErrorCodeReserved,
      },
    },
    'openrpc-example-pairing-params': {
      description:
        'Example pairing params must match the method params, include all required params, and only have a result if the method has one.',
      message: '{{error}}',
      severity: 'warn',
      recommended: true,
      given: '$.methods[*]',
      then: {
        function: openrpcExamplePairingParams,
      },
    },
    'openrpc-example-values': {
      description: 'Example pairing values must be valid against the schema of the matching param or result.',
      message: '{{error}}',
      severity: 'warn',
      recommended: true,
      given: '$.methods[*]',
      then: {
        function: openrpcExampleValues,
      },
    },
    'openrpc-server-url': {
      description:
        'Server "url" must be a valid (possibly relative) URL and its {variables} must be defined in "variables".',
      message: '{{error}}',
      severity: 'warn',
      recommended: true,
      given: ['$.servers[*]', '$.methods[*].servers[*]'],
      then: {
        function: openrpcServerUrl,
      },
    },
  },
};

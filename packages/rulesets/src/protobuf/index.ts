import { protobuf } from '@stoplight/spectral-formats';
import { casing, truthy } from '@stoplight/spectral-functions';
import { Protobuf } from '@stoplight/spectral-parsers';

import protobufComment from './functions/protobufComment';
import protobufEnumValueNames from './functions/protobufEnumValueNames';
import protobufEnumZeroValue from './functions/protobufEnumZeroValue';
import protobufFieldNumber from './functions/protobufFieldNumber';
import protobufRpcTypeNames from './functions/protobufRpcTypeNames';

export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/protobuf-rules.md',
  formats: [protobuf],
  parsers: [{ parser: Protobuf, extensions: ['.proto'] }],
  rules: {
    'protobuf-package-defined': {
      description: 'Files must declare a package.',
      message: 'Files must declare a package.',
      severity: 'warn',
      given: '$',
      then: {
        field: 'package',
        function: truthy,
      },
    },
    'protobuf-type-names-pascal-case': {
      description: 'Message, enum and service names must be PascalCase.',
      message: 'Name "{{value}}" must be PascalCase.',
      severity: 'warn',
      given: ['$..messages[*].name', '$..enums[*].name', '$.services[*].name'],
      then: {
        function: casing,
        functionOptions: {
          type: 'pascal',
        },
      },
    },
    'protobuf-field-names-lower-snake-case': {
      description: 'Field names must be lower_snake_case.',
      message: 'Field name "{{value}}" must be lower_snake_case.',
      severity: 'warn',
      given: '$..fields[*].name',
      then: {
        function: casing,
        functionOptions: {
          type: 'snake',
        },
      },
    },
    'protobuf-enum-value-names': {
      description: 'Enum value names must be UPPER_SNAKE_CASE and prefixed with the UPPER_SNAKE_CASE enum name.',
      message: '{{error}}',
      severity: 'warn',
      given: '$..enums[*]',
      then: {
        function: protobufEnumValueNames,
      },
    },
    'protobuf-enum-zero-value-unspecified': {
      description: 'The zero value of an enum must be suffixed with "_UNSPECIFIED".',
      message: '{{error}}',
      severity: 'warn',
      given: '$..enums[*]',
      then: {
        function: protobufEnumZeroValue,
      },
    },
    'protobuf-rpc-request-response-names': {
      description: 'RPC request and response types must be named "<Rpc>Request" and "<Rpc>Response".',
      message: '{{error}}',
      severity: 'warn',
      given: '$.services[*]',
      then: {
        function: protobufRpcTypeNames,
      },
    },
    'protobuf-comments': {
      description: 'Services, RPCs and messages must have a leading comment.',
      message: '{{error}}',
      severity: 'warn',
      given: ['$.services[*]', '$.services[*].rpcs[*]', '$..messages[*]'],
      then: {
        function: protobufComment,
      },
    },
    'protobuf-field-number-range': {
      description:
        'Field numbers must be between 1 and 536870911 and outside the 19000-19999 range reserved by Protobuf.',
      message: '{{error}}',
      severity: 'error',
      given: '$..fields[*].number',
      then: {
        function: protobufFieldNumber,
      },
    },
  },
};

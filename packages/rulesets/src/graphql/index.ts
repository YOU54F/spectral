import { graphql } from '@stoplight/spectral-formats';
import { casing, schema, truthy } from '@stoplight/spectral-functions';
import { Graphql } from '@stoplight/spectral-parsers';

import graphqlUniqueTypeNames from './functions/graphqlUniqueTypeNames';

const NAMED_TYPE_DEFINITIONS =
  "$.definitions[?(@.kind === 'ScalarTypeDefinition' || @.kind === 'ObjectTypeDefinition' || @.kind === 'InterfaceTypeDefinition' || @.kind === 'UnionTypeDefinition' || @.kind === 'EnumTypeDefinition' || @.kind === 'InputObjectTypeDefinition')]";

export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/graphql-rules.md',
  formats: [graphql],
  parsers: [{ parser: Graphql, extensions: ['.graphql', '.graphqls', '.gql'] }],
  rules: {
    'graphql-type-description': {
      description: 'Types should have a description.',
      severity: 'warn',
      recommended: true,
      given: NAMED_TYPE_DEFINITIONS,
      then: {
        field: 'description',
        function: truthy,
      },
    },
    'graphql-field-description': {
      description: 'Fields and input fields should have a description.',
      severity: 'warn',
      recommended: true,
      given: '$.definitions[*].fields[*]',
      then: {
        field: 'description',
        function: truthy,
      },
    },
    'graphql-argument-description': {
      description: 'Field and directive arguments should have a description.',
      severity: 'info',
      recommended: true,
      given: [
        '$.definitions[*].fields[*].arguments[*]',
        "$.definitions[?(@.kind === 'DirectiveDefinition')].arguments[*]",
      ],
      then: {
        field: 'description',
        function: truthy,
      },
    },
    'graphql-enum-value-description': {
      description: 'Enum values should have a description.',
      severity: 'info',
      recommended: true,
      given: '$.definitions[*].values[*]',
      then: {
        field: 'description',
        function: truthy,
      },
    },
    'graphql-type-name-pascal-case': {
      description: 'Type names should be PascalCase.',
      message: 'Type name "{{value}}" should be PascalCase.',
      severity: 'warn',
      recommended: true,
      given: `${NAMED_TYPE_DEFINITIONS}.name`,
      then: {
        function: casing,
        functionOptions: {
          type: 'pascal',
        },
      },
    },
    'graphql-field-name-camel-case': {
      description: 'Field and argument names should be camelCase.',
      message: 'Name "{{value}}" should be camelCase.',
      severity: 'warn',
      recommended: true,
      given: ['$.definitions[*].fields[*].name', '$.definitions[*].fields[*].arguments[*].name'],
      then: {
        function: casing,
        functionOptions: {
          type: 'camel',
        },
      },
    },
    'graphql-enum-value-upper-case': {
      description: 'Enum values should be UPPER_CASE.',
      message: 'Enum value "{{value}}" should be UPPER_CASE.',
      severity: 'warn',
      recommended: true,
      given: '$.definitions[*].values[*].name',
      then: {
        function: casing,
        functionOptions: {
          type: 'macro',
        },
      },
    },
    'graphql-type-name-unique': {
      description: 'Type names must be unique within the document.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.definitions',
      then: {
        function: graphqlUniqueTypeNames,
      },
    },
    'graphql-deprecated-reason': {
      description: 'Deprecated items should explain why, using the "reason" argument of @deprecated.',
      message: '@deprecated should have a "reason".',
      severity: 'warn',
      recommended: true,
      given: "$..directives[?(@.name === 'deprecated')]",
      then: {
        field: 'arguments',
        function: schema,
        functionOptions: {
          schema: {
            type: 'array',
            contains: {
              type: 'object',
              properties: {
                name: { const: 'reason' },
                value: { type: 'object', properties: { value: { type: 'string', minLength: 1 } } },
              },
              required: ['name'],
            },
          },
        },
      },
    },
  },
};

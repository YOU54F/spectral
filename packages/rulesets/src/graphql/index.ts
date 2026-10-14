import { graphql } from '@stoplight/spectral-formats';
import { casing, pattern, schema } from '@stoplight/spectral-functions';
import { Graphql } from '@stoplight/spectral-parsers/graphql';

import graphqlDescription from './functions/graphqlDescription';
import graphqlSchemaValid from './functions/graphqlSchemaValid';
import graphqlUniqueNames from './functions/graphqlUniqueNames';

const TYPE_DEFINITION_KINDS = [
  'ScalarTypeDefinition',
  'ObjectTypeDefinition',
  'InterfaceTypeDefinition',
  'UnionTypeDefinition',
  'EnumTypeDefinition',
  'InputObjectTypeDefinition',
];

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
        function: graphqlDescription,
      },
    },
    'graphql-field-description': {
      description: 'Fields and input fields should have a description.',
      severity: 'warn',
      recommended: true,
      given: '$.definitions[*].fields[*]',
      then: {
        function: graphqlDescription,
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
        function: graphqlDescription,
      },
    },
    'graphql-enum-value-description': {
      description: 'Enum values should have a description.',
      severity: 'info',
      recommended: true,
      given: '$.definitions[*].values[*]',
      then: {
        function: graphqlDescription,
      },
    },
    'graphql-type-name-pascal-case': {
      description: 'Type names should be PascalCase.',
      message: 'Type name "{{value}}" should be PascalCase.',
      severity: 'warn',
      recommended: true,
      given: `${NAMED_TYPE_DEFINITIONS}.name`,
      then: {
        // Unlike casing's pascal, this allows acronyms such as URL or HTTPHeader.
        function: pattern,
        functionOptions: {
          match: '^[A-Z][A-Za-z0-9]*$',
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
        function: graphqlUniqueNames,
        functionOptions: {
          kinds: TYPE_DEFINITION_KINDS,
          label: 'Type name',
          scope: 'within the document',
        },
      },
    },
    'graphql-field-name-unique': {
      description: 'Field names must be unique within a type, interface or input type.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.definitions[*].fields',
      then: {
        function: graphqlUniqueNames,
        functionOptions: {
          label: 'Field name',
          scope: 'within its type',
        },
      },
    },
    'graphql-enum-value-unique': {
      description: 'Enum values must be unique within an enum.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.definitions[*].values',
      then: {
        function: graphqlUniqueNames,
        functionOptions: {
          label: 'Enum value',
          scope: 'within its enum',
        },
      },
    },
    'graphql-directive-name-unique': {
      description: 'Directive names must be unique within the document.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$.definitions',
      then: {
        function: graphqlUniqueNames,
        functionOptions: {
          kinds: ['DirectiveDefinition'],
          label: 'Directive',
          scope: 'within the document',
        },
      },
    },
    'graphql-schema-valid': {
      description: 'The document must be a valid GraphQL schema.',
      message: '{{error}}',
      severity: 'error',
      recommended: true,
      given: '$',
      then: {
        function: graphqlSchemaValid,
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

import { a2aAgentCard, a2aAgentCard0_3, a2aAgentCard1_0 } from '@stoplight/spectral-formats';
import { enumeration, length, pattern, schema, truthy } from '@stoplight/spectral-functions';

import {
  a2aAgentCardSchema,
  a2aCapabilities,
  a2aProtocolVersion,
  a2aSecurityRequirementsDefined,
  a2aSkillIdUniqueness,
} from './functions';

// "http://" and "ws://" are only tolerated for loopback hosts (local development).
const INSECURE_URL = '^(?:http|ws)://(?!(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?:[:/?#]|$))';

// type "/" subtype, with optional parameters (RFC 6838 restricted-name characters, "*" wildcards allowed).
const MEDIA_TYPE =
  '^(?:\\*|[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*)/(?:\\*|[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*)(?:\\s*;\\s*[^;=\\s]+=[^;]+)*$';

export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/a2a-rules.md',
  formats: [a2aAgentCard, a2aAgentCard0_3, a2aAgentCard1_0],
  rules: {
    'a2a-agent-card-schema': {
      description: 'Agent Card must be valid against the A2A Agent Card schema.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: a2aAgentCardSchema,
      },
    },
    'a2a-protocol-version': {
      description: 'Agent Card must declare a supported A2A protocol version in "Major.Minor" form.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        function: a2aProtocolVersion,
      },
    },
    'a2a-protocol-binding': {
      description: 'Agent interfaces should use one of the core A2A protocol bindings.',
      message: '{{error}}',
      severity: 2,
      recommended: true,
      given: [
        '$.supportedInterfaces[*].protocolBinding',
        '$.additionalInterfaces[*].transport',
        '$.preferredTransport',
      ],
      then: {
        function: enumeration,
        functionOptions: {
          values: ['JSONRPC', 'GRPC', 'HTTP+JSON'],
        },
      },
    },
    'a2a-https-urls': {
      description: 'Agent Card URLs should use encrypted transport (https:// or wss://).',
      message: '"{{property}}" should use an encrypted transport (https:// or wss://), not "{{value}}".',
      severity: 1,
      recommended: true,
      given: [
        '$.url',
        '$.supportedInterfaces[*].url',
        '$.additionalInterfaces[*].url',
        '$.provider.url',
        '$.documentationUrl',
        '$.iconUrl',
        '$.securitySchemes..authorizationUrl',
        '$.securitySchemes..tokenUrl',
        '$.securitySchemes..refreshUrl',
        '$.securitySchemes..deviceAuthorizationUrl',
        '$.securitySchemes..openIdConnectUrl',
        '$.securitySchemes..oauth2MetadataUrl',
      ],
      then: {
        function: pattern,
        functionOptions: {
          notMatch: INSECURE_URL,
        },
      },
    },
    'a2a-skill-id-unique': {
      description: 'Every skill must have a unique "id".',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$.skills',
      then: {
        function: a2aSkillIdUniqueness,
      },
    },
    'a2a-agent-name-description': {
      description: 'Agent Card should have a non-empty "name" and "description".',
      message: 'Agent Card should have a non-empty "name" and "description".',
      severity: 1,
      recommended: true,
      given: '$',
      then: [
        {
          field: 'name',
          function: truthy,
        },
        {
          field: 'description',
          function: truthy,
        },
      ],
    },
    'a2a-skill-name-description': {
      description: 'Every skill should have a non-empty "name" and "description".',
      message: 'Skill should have a non-empty "name" and "description".',
      severity: 1,
      recommended: true,
      given: '$.skills[*]',
      then: [
        {
          field: 'name',
          function: truthy,
        },
        {
          field: 'description',
          function: truthy,
        },
      ],
    },
    'a2a-skill-tags': {
      description: 'Every skill should have at least one tag.',
      message: 'Skill should have at least one tag.',
      severity: 1,
      recommended: true,
      given: '$.skills[*].tags',
      then: {
        function: length,
        functionOptions: {
          min: 1,
        },
      },
    },
    'a2a-skill-examples': {
      description: 'Every skill should provide example prompts in "examples".',
      message: 'Skill should provide at least one example in "examples".',
      severity: 2,
      recommended: true,
      given: '$.skills[*]',
      then: {
        function: schema,
        functionOptions: {
          schema: {
            type: 'object',
            required: ['examples'],
            properties: {
              examples: {
                type: 'array',
                minItems: 1,
              },
            },
          },
        },
      },
    },
    'a2a-security-requirements-defined': {
      description: 'Security requirements must reference schemes declared in "securitySchemes".',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: a2aSecurityRequirementsDefined,
      },
    },
    'a2a-media-types': {
      description: 'Input and output modes should be valid media types.',
      message: '"{{value}}" is not a valid media type (expected "type/subtype").',
      severity: 1,
      recommended: true,
      given: [
        '$.defaultInputModes[*]',
        '$.defaultOutputModes[*]',
        '$.skills[*].inputModes[*]',
        '$.skills[*].outputModes[*]',
      ],
      then: {
        function: pattern,
        functionOptions: {
          match: MEDIA_TYPE,
        },
      },
    },
    'a2a-provider': {
      description: 'Agent Card should identify its service provider in "provider".',
      message: 'Agent Card should have a "provider" object.',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        field: 'provider',
        function: truthy,
      },
    },
    'a2a-capabilities': {
      description:
        'Agent capabilities must be consistent: unique extension URIs, and an authenticated extended card requires security schemes.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        function: a2aCapabilities,
      },
    },
    'a2a-api-key-location': {
      description: 'API key security schemes must be sent in "query", "header" or "cookie".',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      formats: [a2aAgentCard1_0],
      given: '$.securitySchemes[*].apiKeySecurityScheme.location',
      then: {
        function: enumeration,
        functionOptions: {
          values: ['query', 'header', 'cookie'],
        },
      },
    },
  },
};

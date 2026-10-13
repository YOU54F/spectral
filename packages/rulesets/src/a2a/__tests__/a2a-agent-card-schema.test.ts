import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

testRule('a2a-agent-card-schema', [
  {
    name: 'valid 1.0 card',
    document: clone(card1_0),
    errors: [],
  },
  {
    name: 'valid 0.3 card',
    document: clone(card0_3),
    errors: [],
  },
  {
    name: '1.0 card missing a required property',
    document: { ...clone(card1_0), version: undefined },
    errors: [
      {
        message: 'must have required property "version"',
        path: [],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '1.0 card with an unknown property',
    document: { ...clone(card1_0), url: 'https://agent.example.com' },
    errors: [
      {
        message: 'Property "url" is not expected to be here',
        path: ['url'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '1.0 interface missing protocolBinding',
    document: {
      ...clone(card1_0),
      supportedInterfaces: [{ url: 'https://agent.example.com', protocolVersion: '1.0' }],
    },
    errors: [
      {
        message: '"0" property must have required property "protocolBinding"',
        path: ['supportedInterfaces', '0'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '1.0 security scheme with more than one member',
    document: {
      ...clone(card1_0),
      securitySchemes: {
        bearer: {
          httpAuthSecurityScheme: { scheme: 'Bearer' },
          mtlsSecurityScheme: {},
        },
      },
    },
    errors: [
      {
        message: '"bearer" property must define exactly one member',
        path: ['securitySchemes', 'bearer'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '0.3 card missing a required property',
    document: { ...clone(card0_3), defaultOutputModes: undefined },
    errors: [
      {
        message: 'must have required property "defaultOutputModes"',
        path: [],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '0.3 security scheme with an invalid type',
    document: {
      ...clone(card0_3),
      securitySchemes: { bearer: { type: 'htp', scheme: 'bearer' } },
    },
    errors: [
      {
        message:
          '"type" property must be equal to one of the allowed values: "apiKey", "http", "oauth2", "openIdConnect", "mutualTLS". Did you mean "http"?',
        path: ['securitySchemes', 'bearer', 'type'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '0.3 apiKey security scheme missing "in"',
    document: {
      ...clone(card0_3),
      securitySchemes: { key: { type: 'apiKey', name: 'X-API-Key' } },
      security: [{ key: [] }],
    },
    errors: [
      {
        message: '"key" property must have required property "in"',
        path: ['securitySchemes', 'key'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'pre-0.3 card is not schema validated',
    document: { ...clone(card0_3), protocolVersion: '0.2.5', skills: [{}] },
    errors: [],
  },
]);

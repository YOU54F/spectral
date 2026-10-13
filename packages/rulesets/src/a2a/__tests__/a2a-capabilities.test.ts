import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

testRule('a2a-capabilities', [
  {
    name: 'valid 1.0 card with an extended card and extensions',
    document: {
      ...clone(card1_0),
      capabilities: {
        extendedAgentCard: true,
        extensions: [{ uri: 'https://example.com/ext/a' }, { uri: 'https://example.com/ext/b' }],
      },
    },
    errors: [],
  },
  {
    name: 'valid 0.3 card with an extended card',
    document: { ...clone(card0_3), supportsAuthenticatedExtendedCard: true },
    errors: [],
  },
  {
    name: '1.0 extended card without security schemes',
    document: {
      ...clone(card1_0),
      securitySchemes: undefined,
      securityRequirements: undefined,
      capabilities: { extendedAgentCard: true },
    },
    errors: [
      {
        message:
          'An extended Agent Card requires authentication, but the Agent Card does not declare any "securitySchemes".',
        path: ['capabilities', 'extendedAgentCard'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: '0.3 extended card without security schemes',
    document: {
      ...clone(card0_3),
      securitySchemes: {},
      security: undefined,
      supportsAuthenticatedExtendedCard: true,
    },
    errors: [
      {
        message:
          'An extended Agent Card requires authentication, but the Agent Card does not declare any "securitySchemes".',
        path: ['supportsAuthenticatedExtendedCard'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: '0.3 card using the 1.0 extendedAgentCard capability',
    document: { ...clone(card0_3), capabilities: { extendedAgentCard: true } },
    errors: [
      {
        message:
          '"capabilities.extendedAgentCard" is an A2A 1.0 field; 0.3 Agent Cards use "supportsAuthenticatedExtendedCard".',
        path: ['capabilities', 'extendedAgentCard'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'duplicated extension URIs',
    document: {
      ...clone(card1_0),
      capabilities: {
        extensions: [{ uri: 'https://example.com/ext/a' }, { uri: 'https://example.com/ext/a', required: true }],
      },
    },
    errors: [
      {
        message: 'Extension "uri" must be unique. "https://example.com/ext/a" is duplicated.',
        path: ['capabilities', 'extensions', '1', 'uri'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

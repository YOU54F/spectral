import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

function withApiKey(location: string): Record<string, unknown> {
  return {
    ...clone(card1_0),
    securitySchemes: {
      key: { apiKeySecurityScheme: { name: 'X-API-Key', location } },
    },
    securityRequirements: [{ schemes: { key: { list: [] } } }],
  };
}

testRule('a2a-api-key-location', [
  ...['query', 'header', 'cookie'].map(location => ({
    name: `valid 1.0 API key in ${location}`,
    document: withApiKey(location),
    errors: [],
  })),
  {
    name: 'valid 0.3 card (location is enforced by the 0.3 schema)',
    document: clone(card0_3),
    errors: [],
  },
  {
    name: 'invalid 1.0 API key location',
    document: withApiKey('body'),
    errors: [
      {
        message: '"body" must be equal to one of the allowed values: "query", "header", "cookie"',
        path: ['securitySchemes', 'key', 'apiKeySecurityScheme', 'location'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

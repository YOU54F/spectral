// Minimal, valid Agent Cards used as the base for the rule tests.

export const card1_0 = {
  name: 'Recipe Agent',
  description: 'Agent that helps users with recipes and cooking.',
  version: '1.0.0',
  provider: {
    organization: 'Example Org',
    url: 'https://example.com',
  },
  supportedInterfaces: [
    {
      url: 'https://agent.example.com/a2a/v1',
      protocolBinding: 'JSONRPC',
      protocolVersion: '1.0',
    },
    {
      url: 'https://agent.example.com/rest',
      protocolBinding: 'HTTP+JSON',
      protocolVersion: '1.0',
    },
  ],
  capabilities: {
    streaming: true,
    pushNotifications: false,
  },
  securitySchemes: {
    bearer: {
      httpAuthSecurityScheme: {
        scheme: 'Bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  securityRequirements: [{ schemes: { bearer: { list: [] } } }],
  defaultInputModes: ['text/plain', 'application/json'],
  defaultOutputModes: ['text/plain'],
  skills: [
    {
      id: 'recipe-search',
      name: 'Recipe search',
      description: 'Finds recipes by ingredient or cuisine.',
      tags: ['cooking', 'search'],
      examples: ['Find me a vegetarian lasagne recipe'],
    },
  ],
};

export const card0_3 = {
  protocolVersion: '0.3.0',
  name: 'Recipe Agent',
  description: 'Agent that helps users with recipes and cooking.',
  url: 'https://agent.example.com/a2a/v1',
  preferredTransport: 'JSONRPC',
  additionalInterfaces: [
    { url: 'https://agent.example.com/a2a/v1', transport: 'JSONRPC' },
    { url: 'https://agent.example.com/rest', transport: 'HTTP+JSON' },
  ],
  version: '1.0.0',
  provider: {
    organization: 'Example Org',
    url: 'https://example.com',
  },
  capabilities: {
    streaming: true,
    pushNotifications: false,
  },
  securitySchemes: {
    bearer: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  security: [{ bearer: [] }],
  defaultInputModes: ['text/plain', 'application/json'],
  defaultOutputModes: ['text/plain'],
  skills: [
    {
      id: 'recipe-search',
      name: 'Recipe search',
      description: 'Finds recipes by ingredient or cuisine.',
      tags: ['cooking', 'search'],
      examples: ['Find me a vegetarian lasagne recipe'],
    },
  ],
};

type Card = Record<string, unknown>;

export function clone<T extends Card>(card: T): T {
  return JSON.parse(JSON.stringify(card)) as T;
}

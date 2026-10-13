import { a2aAgentCard, a2aAgentCard0_3, a2aAgentCard1_0 } from '../a2a';

const card1_0 = {
  name: 'Recipe Agent',
  supportedInterfaces: [{ url: 'https://agent.example.com/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
  capabilities: {},
  skills: [],
};

const card0_3 = {
  name: 'Recipe Agent',
  url: 'https://agent.example.com/a2a',
  protocolVersion: '0.3.0',
  capabilities: {},
  skills: [],
};

const invalidDocuments = [
  null,
  [],
  'name',
  {},
  { name: 'Agent' },
  { name: 'Agent', capabilities: {}, skills: [] },
  { name: 1, url: 'https://example.com', capabilities: {}, skills: [] },
  { name: 'Agent', url: 'https://example.com', capabilities: [], skills: [] },
  { name: 'Agent', url: 'https://example.com', capabilities: {}, skills: {} },
  { name: 'Agent', supportedInterfaces: {}, capabilities: {}, skills: [] },
  { openapi: '3.1.0', info: { title: 'API', version: '1' }, paths: {} },
  { asyncapi: '3.0.0', info: { title: 'API', version: '1' } },
];

describe('A2A Agent Card format', () => {
  describe('A2A Agent Card 1.0.x', () => {
    it('recognizes a 1.0 card', () => {
      expect(a2aAgentCard1_0(card1_0, null)).toBe(true);
    });

    it('does not recognize a 0.3 card', () => {
      expect(a2aAgentCard1_0(card0_3, null)).toBe(false);
    });

    it.each(invalidDocuments)('does not recognize invalid document %o', document => {
      expect(a2aAgentCard1_0(document, null)).toBe(false);
    });
  });

  describe('A2A Agent Card 0.3.x', () => {
    it.each(['0.3', '0.3.0', '0.3.1'])('recognizes protocolVersion %s', protocolVersion => {
      expect(a2aAgentCard0_3({ ...card0_3, protocolVersion }, null)).toBe(true);
    });

    it.each(['0.2.5', '0.4.0', '1.0', 0.3, null])('does not recognize protocolVersion %o', protocolVersion => {
      expect(a2aAgentCard0_3({ ...card0_3, protocolVersion }, null)).toBe(false);
    });

    it('does not recognize a card without protocolVersion', () => {
      const { protocolVersion: _, ...card } = card0_3;
      expect(a2aAgentCard0_3(card, null)).toBe(false);
    });

    it('does not recognize a 1.0 card', () => {
      expect(a2aAgentCard0_3(card1_0, null)).toBe(false);
      expect(a2aAgentCard0_3({ ...card1_0, url: 'https://example.com', protocolVersion: '0.3.0' }, null)).toBe(false);
    });

    it.each(invalidDocuments)('does not recognize invalid document %o', document => {
      expect(a2aAgentCard0_3(document, null)).toBe(false);
    });
  });

  describe('A2A Agent Card (any version)', () => {
    it.each([card1_0, card0_3, { ...card0_3, protocolVersion: '0.2.5' }])('recognizes card %o', document => {
      expect(a2aAgentCard(document, null)).toBe(true);
    });

    it.each(invalidDocuments)('does not recognize invalid document %o', document => {
      expect(a2aAgentCard(document, null)).toBe(false);
    });
  });
});

import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

// A2A (Agent2Agent) protocol Agent Card, as served from /.well-known/agent-card.json.
// Spec: https://a2a-protocol.org/latest/specification/

type MaybeAgentCard = Record<string, unknown> & {
  name: string;
  capabilities: Record<string, unknown>;
  skills: unknown[];
};

const a2a0_3Regex = /^0\.3(?:\.[0-9]+)?$/;

// Every released Agent Card shape (0.2.x, 0.3.x, 1.0.x) has a name, a capabilities object and a skills array.
const hasAgentCardShape = (document: unknown): document is MaybeAgentCard =>
  isPlainObject(document) &&
  typeof document['name'] === 'string' &&
  isPlainObject(document['capabilities']) &&
  Array.isArray(document['skills']);

// 1.0 replaced the top-level url/preferredTransport/protocolVersion fields with supportedInterfaces[].
const isA2aAgentCard1_0 = (document: unknown): document is MaybeAgentCard & { supportedInterfaces: unknown[] } =>
  hasAgentCardShape(document) && Array.isArray(document['supportedInterfaces']);

const isA2aAgentCard0_3 = (document: unknown): document is MaybeAgentCard & { url: string; protocolVersion: string } =>
  hasAgentCardShape(document) &&
  !('supportedInterfaces' in document) &&
  typeof document['url'] === 'string' &&
  typeof document['protocolVersion'] === 'string' &&
  a2a0_3Regex.test(document['protocolVersion']);

// Any Agent Card, including pre-0.3 cards that expose a top-level url.
const isA2aAgentCard = (document: unknown): document is MaybeAgentCard =>
  hasAgentCardShape(document) &&
  (Array.isArray(document['supportedInterfaces']) || typeof document['url'] === 'string');

export const a2aAgentCard: Format = isA2aAgentCard;
a2aAgentCard.displayName = 'A2A Agent Card';

export const a2aAgentCard0_3: Format = isA2aAgentCard0_3;
a2aAgentCard0_3.displayName = 'A2A Agent Card 0.3.x';

export const a2aAgentCard1_0: Format = isA2aAgentCard1_0;
a2aAgentCard1_0.displayName = 'A2A Agent Card 1.0.x';

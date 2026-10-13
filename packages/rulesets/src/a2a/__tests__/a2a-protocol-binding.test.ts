import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const card1_0WithCustomBinding = clone(card1_0);
card1_0WithCustomBinding.supportedInterfaces[0].protocolBinding = 'jsonrpc';

testRule('a2a-protocol-binding', [
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
    name: '1.0 interface with a non-core binding',
    document: card1_0WithCustomBinding,
    errors: [
      {
        message: '"jsonrpc" must be equal to one of the allowed values: "JSONRPC", "GRPC", "HTTP+JSON"',
        path: ['supportedInterfaces', '0', 'protocolBinding'],
        severity: DiagnosticSeverity.Information,
      },
    ],
  },
  {
    name: '0.3 card with non-core transports',
    document: {
      ...clone(card0_3),
      preferredTransport: 'WEBSOCKET',
      additionalInterfaces: [{ url: 'https://agent.example.com/rest', transport: 'REST' }],
    },
    errors: [
      {
        message: '"WEBSOCKET" must be equal to one of the allowed values: "JSONRPC", "GRPC", "HTTP+JSON"',
        path: ['preferredTransport'],
        severity: DiagnosticSeverity.Information,
      },
      {
        message: '"REST" must be equal to one of the allowed values: "JSONRPC", "GRPC", "HTTP+JSON"',
        path: ['additionalInterfaces', '0', 'transport'],
        severity: DiagnosticSeverity.Information,
      },
    ],
  },
]);

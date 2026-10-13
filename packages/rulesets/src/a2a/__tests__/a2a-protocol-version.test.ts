import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

function withInterfaceVersion(protocolVersion: string): Record<string, unknown> {
  const card = clone(card1_0);
  card.supportedInterfaces[1].protocolVersion = protocolVersion;
  return card;
}

testRule('a2a-protocol-version', [
  {
    name: 'valid 1.0 card',
    document: clone(card1_0),
    errors: [],
  },
  {
    name: '1.0 card also exposing a 0.3 interface',
    document: withInterfaceVersion('0.3'),
    errors: [],
  },
  {
    name: 'valid 0.3 card',
    document: clone(card0_3),
    errors: [],
  },
  {
    name: '1.0 interface using a patch version',
    document: withInterfaceVersion('1.0.1'),
    errors: [
      {
        message: 'Protocol version should be "Major.Minor" ("1.0"); patch versions should not be used.',
        path: ['supportedInterfaces', '1', 'protocolVersion'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: '1.0 interface using an unknown version',
    document: withInterfaceVersion('2.0'),
    errors: [
      {
        message: 'Unrecognised A2A protocol version "2.0". Expected one of: "0.3", "1.0".',
        path: ['supportedInterfaces', '1', 'protocolVersion'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'pre-0.3 card',
    document: { ...clone(card0_3), protocolVersion: '0.2.5' },
    errors: [
      {
        message: 'Unrecognised or unsupported A2A protocol version "0.2.5". Expected one of: "0.3", "1.0".',
        path: ['protocolVersion'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'top-level 1.0 protocolVersion without supportedInterfaces',
    document: { ...clone(card0_3), protocolVersion: '1.0' },
    errors: [
      {
        message:
          'A2A 1.0 Agent Cards declare protocol versions per interface in "supportedInterfaces" instead of a top-level "protocolVersion".',
        path: ['protocolVersion'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'card without any protocol version',
    document: { ...clone(card0_3), protocolVersion: undefined },
    errors: [
      {
        message:
          'Agent Card must declare its A2A protocol version via "supportedInterfaces" (1.0) or "protocolVersion" (0.3).',
        path: [],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

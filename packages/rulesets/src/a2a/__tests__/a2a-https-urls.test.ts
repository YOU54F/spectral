import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const insecure1_0 = clone(card1_0);
insecure1_0.supportedInterfaces[0].url = 'http://agent.example.com/a2a/v1';
insecure1_0.provider.url = 'http://example.com';

const local1_0 = clone(card1_0);
local1_0.supportedInterfaces[0].url = 'http://localhost:8080/a2a/v1';
local1_0.supportedInterfaces[1].url = 'http://127.0.0.1/rest';

testRule('a2a-https-urls', [
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
    name: 'loopback URLs are allowed for local development',
    document: local1_0,
    errors: [],
  },
  {
    name: '1.0 card with insecure URLs',
    document: insecure1_0,
    errors: [
      {
        message: '"url" should use an encrypted transport (https:// or wss://), not "http://example.com".',
        path: ['provider', 'url'],
        severity: DiagnosticSeverity.Warning,
      },
      {
        message: '"url" should use an encrypted transport (https:// or wss://), not "http://agent.example.com/a2a/v1".',
        path: ['supportedInterfaces', '0', 'url'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: '0.3 card with insecure URLs',
    document: {
      ...clone(card0_3),
      url: 'ws://agent.example.com/a2a',
      securitySchemes: {
        oidc: { type: 'openIdConnect', openIdConnectUrl: 'http://id.example.com/.well-known/openid-configuration' },
      },
      security: [{ oidc: [] }],
    },
    errors: [
      {
        message: '"url" should use an encrypted transport (https:// or wss://), not "ws://agent.example.com/a2a".',
        path: ['url'],
        severity: DiagnosticSeverity.Warning,
      },
      {
        message:
          '"openIdConnectUrl" should use an encrypted transport (https:// or wss://), not "http://id.example.com/.well-known/openid-configuration".',
        path: ['securitySchemes', 'oidc', 'openIdConnectUrl'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

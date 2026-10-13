import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

testRule('a2a-provider', [
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
    name: 'card without a provider',
    document: { ...clone(card1_0), provider: undefined },
    errors: [
      {
        message: 'Agent Card should have a "provider" object.',
        path: [],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

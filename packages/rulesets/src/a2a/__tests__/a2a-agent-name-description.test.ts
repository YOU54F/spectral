import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

testRule('a2a-agent-name-description', [
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
    name: 'card with an empty name and no description',
    document: { ...clone(card1_0), name: '', description: undefined },
    errors: [
      {
        message: 'Agent Card should have a non-empty "name" and "description".',
        path: [],
        severity: DiagnosticSeverity.Warning,
      },
      {
        message: 'Agent Card should have a non-empty "name" and "description".',
        path: ['name'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

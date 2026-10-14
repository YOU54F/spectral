import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';

testRule('avro-enum-symbols-valid', [
  {
    name: 'valid enum',
    document: { type: 'enum', name: 'Suit', symbols: ['SPADES', 'HEARTS', '_X1'], default: 'SPADES' },
    errors: [],
  },
  {
    name: 'invalid enum',
    document: {
      type: 'enum',
      name: 'Suit',
      namespace: 'cards',
      symbols: ['SPADES', 'two words', 'SPADES'],
      default: 'JOKER',
    },
    errors: [
      {
        message: 'Enum symbol "two words" is not a valid Avro name. It must match [A-Za-z_][A-Za-z0-9_]*.',
        path: ['symbols', '1'],
        severity: DiagnosticSeverity.Error,
      },
      { message: 'Enum symbol "SPADES" is duplicated in enum "cards.Suit".', path: ['symbols', '2'] },
      { message: 'Default "JOKER" of enum "cards.Suit" is not one of its symbols.', path: ['default'] },
    ],
  },
]);

import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const skill = card1_0.skills[0];

testRule('a2a-skill-examples', [
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
    name: 'skills without examples',
    document: {
      ...clone(card1_0),
      skills: [
        { ...skill, examples: undefined },
        { ...skill, id: 'recipe-plan', examples: [] },
      ],
    },
    errors: [
      {
        message: 'Skill should provide at least one example in "examples".',
        path: ['skills', '0'],
        severity: DiagnosticSeverity.Information,
      },
      {
        message: 'Skill should provide at least one example in "examples".',
        path: ['skills', '1', 'examples'],
        severity: DiagnosticSeverity.Information,
      },
    ],
  },
]);

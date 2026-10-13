import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const skill = card1_0.skills[0];

testRule('a2a-skill-tags', [
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
    name: 'skill with no tags',
    document: {
      ...clone(card0_3),
      skills: [skill, { ...skill, id: 'recipe-plan', tags: [] }],
    },
    errors: [
      {
        message: 'Skill should have at least one tag.',
        path: ['skills', '1', 'tags'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

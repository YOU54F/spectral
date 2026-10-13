import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const skill = card1_0.skills[0];

testRule('a2a-skill-id-unique', [
  {
    name: 'valid 1.0 card',
    document: {
      ...clone(card1_0),
      skills: [skill, { ...skill, id: 'recipe-plan' }],
    },
    errors: [],
  },
  {
    name: '1.0 card with duplicated skill ids',
    document: {
      ...clone(card1_0),
      skills: [skill, { ...skill, id: 'recipe-plan' }, skill],
    },
    errors: [
      {
        message: '"id" must be unique across all skills. "recipe-search" is duplicated.',
        path: ['skills', '2', 'id'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '0.3 card with duplicated skill ids',
    document: {
      ...clone(card0_3),
      skills: [skill, skill],
    },
    errors: [
      {
        message: '"id" must be unique across all skills. "recipe-search" is duplicated.',
        path: ['skills', '1', 'id'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);
